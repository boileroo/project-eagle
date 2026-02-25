import { useEffect } from 'react';
import type { ScorecardData } from '@/types';

const HOLE_STORAGE_KEY_PREFIX = 'eagle-live-hole-';

interface UseScoringResumeOptions {
  roundId: string;
  totalHoles: number;
  holes: Array<{ holeNumber: number }>;
  groupParticipants: Array<{ id: string }>;
  scorecard: ScorecardData;
  currentHole: number;
  onHoleChange: (hole: number) => void;
}

/**
 * Manages hole persistence for live scoring.
 *
 * On mount, resumes the last-visited hole from localStorage for this round,
 * falling back to the first hole where none of the group has a recorded score.
 * On every hole change, persists the current hole to localStorage.
 *
 * The `onMount` resume intentionally only runs once (when `roundId` changes)
 * to avoid overriding explicit user navigation mid-round.
 */
export function useScoringResume({
  roundId,
  totalHoles,
  holes,
  groupParticipants,
  scorecard,
  currentHole,
  onHoleChange,
}: UseScoringResumeOptions): void {
  // Resume from last stored hole on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (totalHoles === 0) return;

    const stored = window.localStorage.getItem(
      `${HOLE_STORAGE_KEY_PREFIX}${roundId}`,
    );
    const storedHole = stored ? parseInt(stored, 10) : null;
    if (storedHole && storedHole >= 1 && storedHole <= totalHoles) {
      onHoleChange(storedHole);
      return;
    }

    // Fall back to first hole where none of the group has a score
    if (groupParticipants.length > 0) {
      const firstUnscored = holes.find((h) =>
        groupParticipants.every((p) => !scorecard[p.id]?.[h.holeNumber]),
      );
      onHoleChange(firstUnscored?.holeNumber ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]); // Intentionally only run on mount / round change

  // Persist current hole on every change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `${HOLE_STORAGE_KEY_PREFIX}${roundId}`,
      String(currentHole),
    );
  }, [roundId, currentHole]);
}
