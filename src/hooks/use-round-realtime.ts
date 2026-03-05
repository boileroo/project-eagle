import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const INVALIDATE_DEBOUNCE_MS = 500;

export function useRoundRealtime(roundId: string, accessToken: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!accessToken) {
      console.log(
        `[useRoundRealtime] Skipping subscription for round ${roundId}: no access token`,
      );
      return;
    }

    console.log(
      `[useRoundRealtime] Setting up subscription for round ${roundId}`,
    );

    // Authenticate the Realtime connection explicitly so the WS connects as
    // the authenticated user (required for RLS-gated postgres_changes).
    supabase.realtime.setAuth(accessToken);

    const invalidateRoundQueries = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        console.log(`[useRoundRealtime] Invalidating round ${roundId}`);
        void queryClient.invalidateQueries({
          queryKey: ['round', roundId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['competition', 'round', roundId],
        });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'round_participants',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          invalidateRoundQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'round_participants',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          invalidateRoundQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'round_participants',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          invalidateRoundQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `id=eq.${roundId}`,
        },
        () => {
          invalidateRoundQueries();
        },
      )
      .subscribe((status, err) => {
        console.log(
          `[useRoundRealtime] Channel status for round ${roundId}: ${status}`,
          err ?? '',
        );
        if (status === 'SUBSCRIBED') {
          invalidateRoundQueries();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error(
            `[useRoundRealtime] channel ${status} for round ${roundId}`,
            err ?? '',
          );
        }
      });

    channelRef.current = channel;

    // When the access token rotates (sessions open > 1 hour), re-auth the
    // Realtime socket so the subscription stays alive.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, roundId, accessToken]);
}
