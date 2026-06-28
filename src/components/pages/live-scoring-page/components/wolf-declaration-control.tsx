import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDecisionsFn } from '@/lib/decisions.server';
import { useSubmitDecision } from '@/lib/decisions';
import { wolfIndexForHole } from '@/lib/domain/wolf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { RoundData, RoundGamesData } from '@/types';

type WolfDeclarationControlProps = {
  round: RoundData;
  games: RoundGamesData;
  holeNumber: number;
  groupPlayers: RoundData['players'];
  canDeclare: boolean;
};

export function WolfDeclarationControl({
  round,
  games,
  holeNumber,
  groupPlayers,
  canDeclare,
}: WolfDeclarationControlProps) {
  const queryClient = useQueryClient();
  const [submitDecision, { isPending: submitting }] = useSubmitDecision();

  const wolfGame = games.find((c) => c.format === 'wolf');
  const groupId = groupPlayers[0]?.groupId ?? '';

  const { data: decisions } = useQuery({
    queryKey: ['decisions', wolfGame?.id, groupId],
    queryFn: () =>
      getDecisionsFn({
        data: { gameId: wolfGame!.id, groupId },
      }),
    enabled: wolfGame != null,
    staleTime: 30_000,
  });

  if (!wolfGame || groupPlayers.length < 2) return null;

  const wolfIdx = wolfIndexForHole(holeNumber, groupPlayers.length);
  const wolfPlayer = groupPlayers[wolfIdx];

  const currentDecision = decisions?.find((d) => d.holeNumber === holeNumber);
  const currentDecisionData = currentDecision?.data as {
    partnerPlayerId?: string | null;
    isBlindLoneWolf?: boolean;
  } | null;
  const currentPartnerIdRaw = currentDecisionData?.partnerPlayerId ?? null;
  const currentPartnerId =
    currentPartnerIdRaw !== null &&
    groupPlayers.some((p) => p.id === currentPartnerIdRaw)
      ? currentPartnerIdRaw
      : null;

  const isCurrentlyBlindLoneWolf =
    currentDecision != null &&
    currentPartnerId === null &&
    currentDecisionData?.isBlindLoneWolf === true;
  const isLoneWolf = currentPartnerId === null;

  const currentPartner = currentPartnerId
    ? groupPlayers.find((p) => p.id === currentPartnerId)
    : null;

  const handleSubmit = async (
    partnerPlayerId: string | null,
    isBlindLoneWolf = false,
  ) => {
    if (!canDeclare || submitting) return;
    await submitDecision({
      variables: {
        gameId: wolfGame.id,
        roundId: round.id,
        groupId,
        holeNumber,
        wolfPlayerId: wolfPlayer.id,
        partnerPlayerId,
        isBlindLoneWolf,
      },
      onSuccess: () => {
        const label = isBlindLoneWolf
          ? 'Going blind lone wolf'
          : partnerPlayerId
            ? `Partner set to ${groupPlayers.find((p) => p.id === partnerPlayerId)?.person.displayName ?? 'unknown'}`
            : 'Going lone wolf';
        toast.success(label);
        void queryClient.invalidateQueries({
          queryKey: ['decisions', wolfGame.id],
        });
      },
      onError: (error) =>
        toast.error(error.message || 'Failed to save wolf decision'),
    });
  };

  const potentialPartners = groupPlayers.filter((p) => p.id !== wolfPlayer.id);

  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Wolf
        </Badge>
        <span className="text-sm font-medium">{wolfGame.name}</span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Wolf:</span>
        <span className="font-medium">{wolfPlayer.person.displayName}</span>
        <span className="text-muted-foreground text-xs">
          (Hole {holeNumber})
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Declaration:</span>
        {currentDecision ? (
          isCurrentlyBlindLoneWolf ? (
            <Badge variant="destructive" className="text-xs">
              Blind Lone Wolf
            </Badge>
          ) : isLoneWolf ? (
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

      {canDeclare && (
        <div className="mt-2 flex flex-wrap gap-2">
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

          <Button
            variant={
              currentDecision && isLoneWolf && !isCurrentlyBlindLoneWolf
                ? 'default'
                : 'outline'
            }
            size="sm"
            className="h-7 text-xs"
            disabled={submitting}
            onClick={() => handleSubmit(null)}
          >
            Lone Wolf
          </Button>

          <Button
            variant={isCurrentlyBlindLoneWolf ? 'destructive' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            disabled={submitting}
            onClick={() => handleSubmit(null, true)}
          >
            Blind Lone Wolf
          </Button>
        </div>
      )}
    </div>
  );
}
