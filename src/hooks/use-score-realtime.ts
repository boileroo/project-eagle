import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type ScoreEventRow = {
  recorded_by_user_id: string | null;
};

const INVALIDATE_DEBOUNCE_MS = 500;

export function useScoreRealtime(
  roundId: string,
  userId: string,
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

    const invalidateScoreQueries = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ['round', roundId, 'scorecard'],
        });
        void queryClient.invalidateQueries({
          queryKey: ['competition', 'round', roundId],
        });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`score_events:round:${roundId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'score_events',
          filter: `round_id=eq.${roundId}`,
        },
        (payload: RealtimePostgresInsertPayload<ScoreEventRow>) => {
          if (payload.new?.recorded_by_user_id === userId) return;
          invalidateScoreQueries();
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          invalidateScoreQueries();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error(
            `[useScoreRealtime] channel ${status} for round ${roundId}`,
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
  }, [queryClient, roundId, userId, accessToken]);
}
