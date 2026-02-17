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

export function useScoreRealtime(roundId: string, userId: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          invalidateScoreQueries();
        }
      });

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, roundId, userId]);
}
