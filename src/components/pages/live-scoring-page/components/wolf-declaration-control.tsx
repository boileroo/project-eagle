// ──────────────────────────────────────────────
// WolfDeclarationControl — per-hole wolf partner selection
// Shown in live scoring when a Wolf game exists for the current group
// ──────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGameDecisionsFn,
  submitGameDecisionFn,
} from '@/lib/game-decisions.server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { RoundData, RoundCompetitionsData } from '@/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type WolfDeclarationControlProps = {
  round: RoundData;
  competitions: RoundCompetitionsData;
  holeNumber: number;
  /** Participants in the current group, in group position order (rotation order) */
  groupParticipants: RoundData['participants'];
  /** Can the current user submit a wolf declaration? (commissioner or marker) */
  canDeclare: boolean;
};

// ──────────────────────────────────────────────
// Helper: wolf index for a hole (0-based)
// ──────────────────────────────────────────────

function wolfIndexForHole(holeNumber: number, playerCount: number): number {
  return (holeNumber - 1) % playerCount;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function WolfDeclarationControl({
  round,
  competitions,
  holeNumber,
  groupParticipants,
  canDeclare,
}: WolfDeclarationControlProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Find Wolf competition for this round (within_group)
  const wolfComp = competitions.find((c) => c.formatType === 'wolf');

  // Query current decisions for this Wolf competition
  const { data: decisions } = useQuery({
    queryKey: ['game-decisions', wolfComp?.id],
    queryFn: () =>
      getGameDecisionsFn({ data: { competitionId: wolfComp!.id } }),
    enabled: wolfComp != null,
    staleTime: 30_000,
  });

  if (!wolfComp || groupParticipants.length < 2) return null;

  // Derive wolf player for this hole
  const wolfIdx = wolfIndexForHole(holeNumber, groupParticipants.length);
  const wolfParticipant = groupParticipants[wolfIdx];

  // Find latest decision for this hole (decisions are already deduplicated by server)
  const currentDecision = decisions?.find((d) => d.holeNumber === holeNumber);
  const currentPartnerIdRaw =
    (currentDecision?.data as { partnerPlayerId?: string | null } | null)
      ?.partnerPlayerId ?? null;
  // Validate partner is still in the group
  const currentPartnerId =
    currentPartnerIdRaw !== null &&
    groupParticipants.some((p) => p.id === currentPartnerIdRaw)
      ? currentPartnerIdRaw
      : null;

  const isLoneWolf = currentPartnerId === null;

  const currentPartner = currentPartnerId
    ? groupParticipants.find((p) => p.id === currentPartnerId)
    : null;

  // ── Submit handler ───────────────────────────
  const handleSubmit = async (partnerPlayerId: string | null) => {
    if (!canDeclare || submitting) return;
    setSubmitting(true);
    try {
      await submitGameDecisionFn({
        data: {
          competitionId: wolfComp.id,
          roundId: round.id,
          holeNumber,
          wolfPlayerId: wolfParticipant.id,
          partnerPlayerId,
        },
      });
      toast.success(
        partnerPlayerId
          ? `Partner set to ${groupParticipants.find((p) => p.id === partnerPlayerId)?.person.displayName ?? 'unknown'}`
          : 'Going lone wolf',
      );
      void queryClient.invalidateQueries({
        queryKey: ['game-decisions', wolfComp.id],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save wolf decision',
      );
    }
    setSubmitting(false);
  };

  // ── Potential partners: everyone except the wolf ─
  const potentialPartners = groupParticipants.filter(
    (p) => p.id !== wolfParticipant.id,
  );

  return (
    <div className="rounded-lg border px-3 py-2">
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Wolf
        </Badge>
        <span className="text-sm font-medium">{wolfComp.name}</span>
      </div>

      {/* Wolf info */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Wolf:</span>
        <span className="font-medium">
          {wolfParticipant.person.displayName}
        </span>
        <span className="text-muted-foreground text-xs">
          (Hole {holeNumber})
        </span>
      </div>

      {/* Current declaration */}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Declaration:</span>
        {currentDecision ? (
          isLoneWolf ? (
            <Badge variant="secondary" className="text-xs">
              Lone Wolf
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs">
              Partner: {currentPartner?.person.displayName ?? 'Unknown'}
            </Badge>
          )
        ) : (
          <span className="text-muted-foreground text-xs italic">
            Not declared
          </span>
        )}
      </div>

      {/* Controls — only shown when user can declare */}
      {canDeclare && (
        <div className="mt-2 flex flex-wrap gap-2">
          {/* Partner options */}
          {potentialPartners.map((partner) => (
            <Button
              key={partner.id}
              variant={currentPartnerId === partner.id ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              disabled={submitting}
              onClick={() => handleSubmit(partner.id)}
            >
              {partner.person.displayName}
            </Button>
          ))}

          {/* Lone wolf option */}
          <Button
            variant={currentDecision && isLoneWolf ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            disabled={submitting}
            onClick={() => handleSubmit(null)}
          >
            Lone Wolf
          </Button>
        </div>
      )}
    </div>
  );
}
