import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDecisionsFn } from '@/lib/decisions.server';
import { useSubmitDecision } from '@/lib/decisions';
import { wolfIndexForHole } from '@/lib/domain/wolf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { RoundData, RoundGamesData } from '@/types';

type WolfDeclarationPanelProps = {
  wolfGame: RoundGamesData[number];
  groupParticipants: RoundData['players'];
  round: RoundData;
  holeCount: number;
  canDeclare: boolean;
};

export function WolfDeclarationPanel({
  wolfGame,
  groupParticipants,
  round,
  holeCount,
  canDeclare,
}: WolfDeclarationPanelProps) {
  const queryClient = useQueryClient();
  const [submitDecision, { isPending: submitting }] = useSubmitDecision();

  const groupId = groupParticipants[0]?.groupId || '';

  const { data: decisions } = useQuery({
    queryKey: ['decisions', wolfGame.id, groupId],
    queryFn: () =>
      getDecisionsFn({
        data: { gameId: wolfGame.id, groupId },
      }),
    staleTime: 30_000,
  });

  const handleDeclare = async (
    holeNumber: number,
    wolfParticipantId: string,
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
        wolfPlayerId: wolfParticipantId,
        partnerPlayerId,
        isBlindLoneWolf,
      },
      onSuccess: () => {
        const label = isBlindLoneWolf
          ? 'Going blind lone wolf'
          : partnerPlayerId
            ? `Partner set to ${groupParticipants.find((p) => p.id === partnerPlayerId)?.person.displayName ?? 'unknown'}`
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

  const n = groupParticipants.length;

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-4 pb-1 text-xs font-medium sm:px-0">
        Wolf — {wolfGame.name}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="border px-2 py-1.5 text-left text-xs font-medium">
                Hole
              </th>
              <th className="border px-2 py-1.5 text-left text-xs font-medium">
                Wolf
              </th>
              <th className="border px-2 py-1.5 text-left text-xs font-medium">
                Declaration
              </th>
              {canDeclare && (
                <th className="border px-2 py-1.5 text-left text-xs font-medium">
                  Set
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: holeCount }, (_, i) => {
              const holeNumber = i + 1;
              const wolfIdx = wolfIndexForHole(holeNumber, n);
              const wolfParticipant = groupParticipants[wolfIdx];
              if (!wolfParticipant) return null;

              const decision = decisions?.find(
                (d) => d.holeNumber === holeNumber,
              );
              const decisionData = decision?.data as {
                partnerPlayerId?: string | null;
                isBlindLoneWolf?: boolean;
              } | null;
              const rawPartnerId = decisionData?.partnerPlayerId ?? null;
              const partnerId =
                rawPartnerId !== null &&
                groupParticipants.some((p) => p.id === rawPartnerId)
                  ? rawPartnerId
                  : null;
              const partner = partnerId
                ? groupParticipants.find((p) => p.id === partnerId)
                : null;
              const isDeclared = decision != null;
              const isBlindLoneWolf =
                isDeclared &&
                partnerId === null &&
                decisionData?.isBlindLoneWolf === true;
              const isLoneWolf =
                isDeclared && partnerId === null && !isBlindLoneWolf;

              const potentialPartners = groupParticipants.filter(
                (p) => p.id !== wolfParticipant.id,
              );

              return (
                <tr key={holeNumber} className="hover:bg-muted/20">
                  <td className="border px-2 py-1.5 text-center text-xs font-medium">
                    {holeNumber}
                  </td>
                  <td className="border px-2 py-1.5 text-xs font-medium">
                    {wolfParticipant.person.displayName}
                  </td>
                  <td className="border px-2 py-1.5 text-xs">
                    {!isDeclared ? (
                      <span className="text-muted-foreground italic">
                        Not declared
                      </span>
                    ) : isBlindLoneWolf ? (
                      <Badge variant="destructive" className="text-xs">
                        Blind Lone Wolf
                      </Badge>
                    ) : isLoneWolf ? (
                      <Badge variant="secondary" className="text-xs">
                        Lone Wolf
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        {partner?.person.displayName ?? 'Unknown'}
                      </Badge>
                    )}
                  </td>
                  {canDeclare && (
                    <td className="border px-2 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {potentialPartners.map((p) => (
                          <Button
                            key={p.id}
                            variant={partnerId === p.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={submitting}
                            onClick={() =>
                              handleDeclare(
                                holeNumber,
                                wolfParticipant.id,
                                p.id,
                              )
                            }
                          >
                            {p.person.displayName}
                          </Button>
                        ))}
                        <Button
                          variant={isLoneWolf ? 'default' : 'outline'}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={submitting}
                          onClick={() =>
                            handleDeclare(holeNumber, wolfParticipant.id, null)
                          }
                        >
                          Lone
                        </Button>
                        <Button
                          variant={isBlindLoneWolf ? 'destructive' : 'outline'}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={submitting}
                          onClick={() =>
                            handleDeclare(
                              holeNumber,
                              wolfParticipant.id,
                              null,
                              true,
                            )
                          }
                        >
                          Blind
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
