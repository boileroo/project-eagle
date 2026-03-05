import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const INVALIDATE_DEBOUNCE_MS = 500;

export function useTournamentRealtime(
  tournamentId: string,
  accessToken: string | null,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!accessToken) return;

    // Authenticate the Realtime connection explicitly so the WS connects as
    // the authenticated user (required for RLS-gated postgres_changes).
    supabase.realtime.setAuth(accessToken);

    const invalidateTournamentQueries = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ['tournament', tournamentId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['tournament-leaderboard', tournamentId],
        });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rounds',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rounds',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          invalidateTournamentQueries();
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          invalidateTournamentQueries();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error(
            `[useTournamentRealtime] channel ${status} for tournament ${tournamentId}`,
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
  }, [queryClient, tournamentId, accessToken]);
}
