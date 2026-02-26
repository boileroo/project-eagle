import { useState, useMemo } from 'react';
import { useDeleteCompetition } from '@/lib/competitions';
import { FORMAT_TYPE_LABELS, isBonusFormat } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import {
  calculateCompetitionResults,
  type CompetitionInput,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
  type GroupData,
  type TeamData,
} from '@/lib/domain';
import { resolveEffectiveHandicap, getPlayingHandicap } from '@/lib/handicaps';
import { buildTeamColourMap } from '@/lib/team-colours';
import { CompetitionResults } from '@/components/shared/competition-results';
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
import type { RoundData, ScorecardData, RoundCompetitionsData } from '../types';

export function TeamCompetitionsSection({
  round,
  scorecard,
  competitions,
  isCommissioner,
  hasTeams,
  onChanged,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: RoundCompetitionsData;
  isCommissioner: boolean;
  hasTeams: boolean;
  onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCompetition] = useDeleteCompetition();
  const isDraft = round.status === 'draft';

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

    const groups: GroupData[] = (round.groups ?? []).map((g) => ({
      roundGroupId: g.id,
      groupNumber: g.groupNumber,
      name: g.name ?? null,
      memberParticipantIds: round.participants
        .filter((rp) => rp.roundGroupId === g.id)
        .map((rp) => rp.id),
    }));

    const teamMap = new Map<
      string,
      { teamId: string; name: string; memberParticipantIds: string[] }
    >();
    for (const rp of round.participants) {
      for (const tm of rp.tournamentParticipant?.teamMemberships ?? []) {
        const entry = teamMap.get(tm.team.id) ?? {
          teamId: tm.team.id,
          name: tm.team.name,
          memberParticipantIds: [],
        };
        if (!entry.memberParticipantIds.includes(rp.id)) {
          entry.memberParticipantIds.push(rp.id);
        }
        teamMap.set(tm.team.id, entry);
      }
    }
    const teams: TeamData[] = [...teamMap.values()].map((t) => ({
      ...t,
      tournamentTeamId: t.teamId,
    }));

    return { holes, participants, scores, groups, teams };
  }, [round, scorecard]);

  // Build team colour maps from participant team membership data
  const { participantTeamColours, teamColours } = useMemo(() => {
    // Collect unique teams from all participants, sorted by createdAt for stable ordering
    const teamMap = new Map<string, { id: string; createdAt: Date | string }>();
    for (const rp of round.participants) {
      for (const tm of rp.tournamentParticipant?.teamMemberships ?? []) {
        if (!teamMap.has(tm.team.id)) {
          teamMap.set(tm.team.id, tm.team);
        }
      }
    }
    const sortedTeams = [...teamMap.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const tColours = buildTeamColourMap(sortedTeams);

    // Map roundParticipantId → hex colour via their team membership
    const pColours = new Map<string, string>();
    for (const rp of round.participants) {
      const teamId = rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id;
      if (teamId) {
        const colour = tColours.get(teamId);
        if (colour) pColours.set(rp.id, colour);
      }
    }
    return { participantTeamColours: pColours, teamColours: tColours };
  }, [round.participants]);

  const handleDelete = async (compId: string) => {
    setDeletingId(compId);
    await deleteCompetition({
      variables: { competitionId: compId },
      onSuccess: () => {
        toast.success('Competition deleted.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
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
              {isCommissioner && isDraft && (
                <>
                  {!hasTeams && (
                    <AddIndividualCompDialog
                      tournamentId={round.tournamentId}
                      roundId={round.id}
                      hasTeams={hasTeams}
                      onSaved={onChanged}
                    />
                  )}
                  {hasTeams && (
                    <AddTeamCompDialog
                      tournamentId={round.tournamentId}
                      roundId={round.id}
                      round={round}
                      competitions={competitions}
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
              {isCommissioner && isDraft && ' Click + to add one.'}
            </p>
          ) : (
            <div className="space-y-6">
              {scoredComps.map((comp) => {
                const config: CompetitionConfig = {
                  formatType:
                    comp.formatType as CompetitionConfig['formatType'],
                  config: (comp.configJson ??
                    {}) as CompetitionConfig['config'],
                } as CompetitionConfig;

                let result;
                try {
                  const groupScope = (comp.groupScope ?? 'all') as
                    | 'all'
                    | 'within_group';
                  const input: CompetitionInput = {
                    competition: {
                      id: comp.id,
                      name: comp.name,
                      config,
                      groupScope,
                    },
                    ...engineInputs,
                  };

                  result = calculateCompetitionResults(input);
                } catch (e) {
                  console.error('Error calculating results:', e);
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
                          {comp.competitionCategory === 'match'
                            ? 'Match'
                            : comp.competitionCategory === 'game'
                              ? 'Game'
                              : 'Bonus'}
                        </Badge>
                      </div>
                      {isCommissioner && isDraft && (
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
                      <CompetitionResults
                        result={result}
                        participantTeamColours={participantTeamColours}
                        teamColours={teamColours}
                      />
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
                          isCommissioner={isCommissioner && isDraft}
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
