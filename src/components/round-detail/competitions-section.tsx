import { useState, useMemo } from 'react';
import { deleteCompetitionFn } from '@/lib/competitions.server';
import { FORMAT_TYPE_LABELS, isBonusFormat } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import {
  calculateCompetitionResults,
  type CompetitionInput,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
} from '@/lib/domain';
import { resolveEffectiveHandicap, getPlayingHandicap } from '@/lib/handicaps';
import { CompetitionResults } from '@/components/competition-results';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { EditCompetitionDialog } from './edit-competition-dialog';
import { ConfigureMatchesDialog } from './configure-matches-dialog';
import { AddIndividualCompDialog } from './add-individual-comp-dialog';
import { AddTeamCompDialog } from './add-team-comp-dialog';
import { AddBonusCompDialog } from './add-bonus-comp-dialog';
import { BonusCompRow } from './bonus-comp-row';
import type { RoundData, ScorecardData, CompetitionsData } from './types';

export function CompetitionsSection({
  round,
  scorecard,
  competitions,
  isCommissioner,
  hasTeams,
  onChanged,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: CompetitionsData;
  isCommissioner: boolean;
  hasTeams: boolean;
  onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const engineInputs = useMemo(() => {
    const holes: HoleData[] = round.course.holes.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      strokeIndex: h.strokeIndex,
    }));

    const participants: ParticipantData[] = round.participants.map((rp) => {
      const effectiveHC = resolveEffectiveHandicap({
        handicapOverride: rp.handicapOverride,
        handicapSnapshot: rp.handicapSnapshot,
        tournamentParticipant: rp.tournamentParticipant
          ? { handicapOverride: rp.tournamentParticipant.handicapOverride }
          : null,
      });
      return {
        roundParticipantId: rp.id,
        personId: rp.person.id,
        displayName: rp.person.displayName,
        effectiveHandicap: effectiveHC,
        playingHandicap: getPlayingHandicap(effectiveHC),
        roundGroupId: rp.roundGroupId ?? null,
      };
    });

    const scores: ResolvedScore[] = [];
    for (const [rpId, holeScores] of Object.entries(scorecard)) {
      for (const [holeStr, data] of Object.entries(holeScores)) {
        scores.push({
          roundParticipantId: rpId,
          holeNumber: parseInt(holeStr),
          strokes: data.strokes,
        });
      }
    }

    return { holes, participants, scores };
  }, [round, scorecard]);

  const handleDelete = async (compId: string) => {
    setDeletingId(compId);
    try {
      await deleteCompetitionFn({ data: { competitionId: compId } });
      toast.success('Competition deleted.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete competition',
      );
    }
    setDeletingId(null);
  };

  const scoredComps = competitions.filter(
    (c) => !isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );
  const bonusComps = competitions.filter((c) =>
    isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Competitions</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{competitions.length}</Badge>
              {isCommissioner && (
                <>
                  <AddIndividualCompDialog
                    tournamentId={round.tournamentId}
                    roundId={round.id}
                    hasTeams={hasTeams}
                    onSaved={onChanged}
                  />
                  {hasTeams && (
                    <AddTeamCompDialog
                      tournamentId={round.tournamentId}
                      roundId={round.id}
                      round={round}
                      onSaved={onChanged}
                    />
                  )}
                  <AddBonusCompDialog
                    tournamentId={round.tournamentId}
                    roundId={round.id}
                    onSaved={onChanged}
                  />
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No competitions set up for this round.
              {isCommissioner && ' Click + to add one.'}
            </p>
          ) : (
            <div className="space-y-6">
              {scoredComps.map((comp) => {
                const config: CompetitionConfig = {
                  formatType:
                    comp.formatType as CompetitionConfig['formatType'],
                  config: (comp.configJson ?? {}) as CompetitionConfig['config'],
                } as CompetitionConfig;

                let result;
                try {
                  const input: CompetitionInput = {
                    competition: {
                      id: comp.id,
                      name: comp.name,
                      config,
                      groupScope: (comp.groupScope ?? 'all') as
                        | 'all'
                        | 'within_group',
                    },
                    ...engineInputs,
                  };
                  result = calculateCompetitionResults(input);
                } catch {
                  result = null;
                }

                return (
                  <div key={comp.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{comp.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {FORMAT_TYPE_LABELS[
                            comp.formatType as CompetitionConfig['formatType']
                          ] ?? comp.formatType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {comp.participantType === 'team'
                            ? 'Team'
                            : 'Individual'}
                        </Badge>
                      </div>
                      {isCommissioner && (
                        <div className="flex items-center gap-1">
                          <EditCompetitionDialog
                            comp={comp}
                            hasGroups={round.groups.length > 0}
                            onSaved={onChanged}
                          />
                          {comp.formatType === 'match_play' && (
                            <ConfigureMatchesDialog
                              comp={comp}
                              participants={round.participants}
                              groups={round.groups}
                              onSaved={onChanged}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7"
                            disabled={deletingId === comp.id}
                            onClick={() => handleDelete(comp.id)}
                          >
                            {deletingId === comp.id ? '…' : '✕'}
                          </Button>
                        </div>
                      )}
                    </div>
                    {result ? (
                      <CompetitionResults result={result} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Unable to calculate results.
                      </p>
                    )}
                    <Separator className="mt-4" />
                  </div>
                );
              })}

              {bonusComps.length > 0 && (
                <div>
                  <h3 className="mb-3 font-medium">Bonus Prizes</h3>
                  <div className="space-y-2">
                    {bonusComps.map((comp) => {
                      const config = comp.configJson as {
                        holeNumber?: number;
                      } | null;
                      const holeNumber = config?.holeNumber ?? 0;
                      const award = comp.bonusAwards?.[0];

                      return (
                        <BonusCompRow
                          key={comp.id}
                          comp={comp}
                          holeNumber={holeNumber}
                          award={award}
                          participants={round.participants}
                          isCommissioner={isCommissioner}
                          roundStatus={round.status}
                          hasGroups={round.groups.length > 0}
                          onChanged={onChanged}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
