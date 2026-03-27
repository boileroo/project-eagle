import { useState, useMemo } from 'react';
import { CircleHelp } from 'lucide-react';
import { useDeleteCompetition } from '@/lib/competitions';
import { FORMAT_TYPE_LABELS, isBonusFormat } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import {
  calculateCompetitionResults,
  calculateGroupedResults,
  type CompetitionInput,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
  type GroupData,
  type TeamData,
  type GameDecisionData,
} from '@/lib/domain';
import { useQuery } from '@tanstack/react-query';
import { getAllGameDecisionsFn } from '@/lib/game-decisions.server';
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
import { AddMatchDialog } from './add-match-dialog';
import { AddTeamCompDialog } from './add-team-comp-dialog';
import { AddBonusCompDialog } from './add-bonus-comp-dialog';
import { BonusCompRow } from './bonus-comp-row';
import { CompetitionsExplainerDialog } from './components/competitions-explainer-dialog';
import { TeamStandingsBanner } from './components/team-standings-banner';
import type { RoundData, ScorecardData, RoundCompetitionsData } from '../types';

type TeamPointsEntry = { teamId: string; teamName: string; points: number };

function collectTeamPoints(
  result: ReturnType<typeof calculateCompetitionResults>,
  teams: TeamData[],
): TeamPointsEntry[] {
  const totals = new Map<string, TeamPointsEntry>();

  const addPoints = (teamId: string, teamName: string, points: number) => {
    const existing = totals.get(teamId) ?? { teamId, teamName, points: 0 };
    existing.points += points;
    totals.set(teamId, existing);
  };

  const playerTeamMap = new Map<string, { teamId: string; teamName: string }>();
  for (const team of teams) {
    for (const memberId of team.memberParticipantIds) {
      playerTeamMap.set(memberId, { teamId: team.teamId, teamName: team.name });
    }
  }

  switch (result.type) {
    case 'match_play':
      for (const match of result.result.matches) {
        const teamA = playerTeamMap.get(match.playerA.roundParticipantId);
        const teamB = playerTeamMap.get(match.playerB.roundParticipantId);
        if (teamA) addPoints(teamA.teamId, teamA.teamName, match.pointsA);
        if (teamB) addPoints(teamB.teamId, teamB.teamName, match.pointsB);
      }
      break;
    case 'best_ball':
    case 'hi_lo':
      for (const match of result.result.matches) {
        addPoints(match.teamA.teamId, match.teamA.name, match.pointsA);
        addPoints(match.teamB.teamId, match.teamB.name, match.pointsB);
      }
      break;
    case 'rumble':
      for (const teamResult of result.result.teamResults) {
        addPoints(teamResult.teamId, teamResult.teamName, teamResult.points);
      }
      break;
  }

  return [...totals.values()];
}

type EngineInputs = {
  holes: HoleData[];
  participants: ParticipantData[];
  scores: ResolvedScore[];
  groups: GroupData[];
  teams: TeamData[];
};

function CompetitionEntry({
  comp,
  engineInputs,
  participantTeamColours,
  teamColours,
  isCommissioner,
  isDraft,
  deletingId,
  round,
  onDelete,
  onChanged,
}: {
  comp: RoundCompetitionsData[number];
  engineInputs: EngineInputs;
  participantTeamColours: Map<string, string>;
  teamColours: Map<string, string>;
  isCommissioner: boolean;
  isDraft: boolean;
  deletingId: string | null;
  round: RoundData;
  onDelete: (id: string) => void;
  onChanged: () => void;
}) {
  const isWolf = comp.formatType === 'wolf';

  const { data: rawDecisions } = useQuery({
    queryKey: ['game-decisions', comp.id],
    queryFn: () => getAllGameDecisionsFn({ data: { competitionId: comp.id } }),
    enabled: isWolf,
    staleTime: 30_000,
  });

  const gameDecisions = useMemo((): GameDecisionData[] => {
    if (!isWolf || !rawDecisions) return [];
    return rawDecisions
      .filter(
        (
          d: any,
        ): d is typeof d & {
          data: {
            wolfPlayerId: string;
            partnerPlayerId: string | null;
            isBlindLoneWolf?: boolean;
          };
        } =>
          typeof (d.data as Record<string, unknown>)?.wolfPlayerId === 'string',
      )
      .map((d: any) => ({
        holeNumber: d.holeNumber,
        roundGroupId: (d.roundGroupId as string | null) ?? null,
        data: {
          wolfPlayerId: (
            d.data as {
              wolfPlayerId: string;
              partnerPlayerId: string | null;
              isBlindLoneWolf?: boolean;
            }
          ).wolfPlayerId,
          partnerPlayerId: (
            d.data as {
              wolfPlayerId: string;
              partnerPlayerId: string | null;
              isBlindLoneWolf?: boolean;
            }
          ).partnerPlayerId,
          isBlindLoneWolf: (
            d.data as {
              wolfPlayerId: string;
              partnerPlayerId: string | null;
              isBlindLoneWolf?: boolean;
            }
          ).isBlindLoneWolf,
        },
      }));
  }, [isWolf, rawDecisions]);

  const groupedResult = useMemo(() => {
    const config: CompetitionConfig = {
      formatType: comp.formatType as CompetitionConfig['formatType'],
      config: (comp.configJson ?? {}) as CompetitionConfig['config'],
    } as CompetitionConfig;
    // Rumble handles all groups internally; force 'all' regardless of stored value
    const groupScope =
      comp.formatType === 'rumble'
        ? 'all'
        : ((comp.groupScope ?? 'all') as 'all' | 'within_group');
    const input: CompetitionInput = {
      competition: {
        id: comp.id,
        name: comp.name,
        config,
        groupScope,
        roundGroupId:
          (comp as { roundGroupId?: string | null }).roundGroupId ?? null,
      },
      ...engineInputs,
      gameDecisions: isWolf ? gameDecisions : undefined,
    };

    try {
      if (groupScope === 'within_group' && engineInputs.groups.length > 0) {
        return calculateGroupedResults(input);
      }
      return {
        scope: 'all' as const,
        result: calculateCompetitionResults(input),
      };
    } catch (e) {
      console.error('Error calculating results:', e);
      return null;
    }
  }, [comp, engineInputs, isWolf, gameDecisions]);

  return (
    <div>
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
              hasGroups={round.groups.length > 1}
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
              onClick={() => onDelete(comp.id)}
            >
              {deletingId === comp.id ? '…' : '✕'}
            </Button>
          </div>
        )}
      </div>
      {groupedResult === null ? (
        <p className="text-muted-foreground text-sm">
          Unable to calculate results.
        </p>
      ) : groupedResult.scope === 'within_group' &&
        groupedResult.results.length > 1 ? (
        <div className="space-y-4">
          {groupedResult.results.map((gr) => (
            <div key={gr.groupId}>
              <CompetitionResults
                result={gr.result}
                participantTeamColours={participantTeamColours}
                teamColours={teamColours}
              />
            </div>
          ))}
        </div>
      ) : groupedResult.scope === 'within_group' ? (
        groupedResult.results[0] ? (
          <CompetitionResults
            result={groupedResult.results[0].result}
            participantTeamColours={participantTeamColours}
            teamColours={teamColours}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Unable to calculate results.
          </p>
        )
      ) : (
        <CompetitionResults
          result={groupedResult.result}
          participantTeamColours={participantTeamColours}
          teamColours={teamColours}
        />
      )}
      <Separator className="mt-4" />
    </div>
  );
}

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
  const [explainerOpen, setExplainerOpen] = useState(false);
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

  const hasEnoughPlayers = round.participants.length >= 2;

  const scoredComps = competitions.filter(
    (c) => !isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );
  const bonusComps = competitions.filter((c) =>
    isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );

  const teamStandings = useMemo(() => {
    const isActive = round.status === 'open' || round.status === 'finalized';
    if (!isActive || engineInputs.teams.length < 2) return null;

    const TEAM_APPLICABLE = new Set(['best_ball', 'hi_lo', 'match_play']);
    // Include rumble only when round is finalized (for winner banner)
    if (round.status === 'finalized') {
      TEAM_APPLICABLE.add('rumble');
    }

    const totals = new Map<string, TeamPointsEntry>();
    const mergePoints = (entries: TeamPointsEntry[]) => {
      for (const entry of entries) {
        const existing = totals.get(entry.teamId) ?? {
          teamId: entry.teamId,
          teamName: entry.teamName,
          points: 0,
        };
        existing.points += entry.points;
        totals.set(entry.teamId, existing);
      }
    };

    for (const comp of scoredComps) {
      if (!TEAM_APPLICABLE.has(comp.formatType)) continue;

      const config: CompetitionConfig = {
        formatType: comp.formatType as CompetitionConfig['formatType'],
        config: (comp.configJson ?? {}) as CompetitionConfig['config'],
      } as CompetitionConfig;
      const groupScope =
        comp.formatType === 'rumble'
          ? 'all'
          : ((comp.groupScope ?? 'all') as 'all' | 'within_group');
      const input = {
        competition: {
          id: comp.id,
          name: comp.name,
          config,
          groupScope,
          roundGroupId:
            (comp as { roundGroupId?: string | null }).roundGroupId ?? null,
        },
        ...engineInputs,
      };

      try {
        const grouped = calculateGroupedResults(input);
        if (grouped.scope === 'all') {
          mergePoints(collectTeamPoints(grouped.result, engineInputs.teams));
        } else {
          for (const gr of grouped.results) {
            mergePoints(collectTeamPoints(gr.result, engineInputs.teams));
          }
        }
      } catch {
        // ignore individual calculation errors
      }
    }

    if (totals.size < 2) return null;
    return [...totals.values()].sort((a, b) => b.points - a.points);
  }, [round.status, engineInputs, scoredComps]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Competitions</span>
            <div className="flex items-center gap-2">
              {/* Show all add buttons at all times; disable when not permitted */}
              <AddIndividualCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                round={round}
                hasTeams={hasTeams}
                onSaved={onChanged}
                disabled={
                  !(isCommissioner && isDraft) || hasTeams || !hasEnoughPlayers
                }
              />

              <AddMatchDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                competitions={competitions}
                onSaved={onChanged}
                disabled={
                  !(isCommissioner && isDraft) || hasTeams || !hasEnoughPlayers
                }
              />

              <AddTeamCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                round={round}
                competitions={competitions}
                onSaved={onChanged}
                disabled={
                  !(isCommissioner && isDraft) || !hasTeams || !hasEnoughPlayers
                }
              />

              <AddBonusCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                onSaved={onChanged}
                disabled={!(isCommissioner && isDraft) || !hasEnoughPlayers}
              />

              {/* Help button always visible */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExplainerOpen(true)}
                title="Learn about competition types"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Individual scores (strokes + stableford) are automatically tracked
              and will be visible once the round is underway.
              {isCommissioner && isDraft && (
                <>
                  <br />
                  Use the above buttons to add additional games or matches.
                </>
              )}
            </p>
          ) : (
            <div className="space-y-6">
              {teamStandings && (
                <TeamStandingsBanner
                  standings={teamStandings}
                  roundStatus={round.status as 'open' | 'finalized'}
                  teamColours={teamColours}
                />
              )}
              {scoredComps.map((comp) => (
                <CompetitionEntry
                  key={comp.id}
                  comp={comp}
                  engineInputs={engineInputs}
                  participantTeamColours={participantTeamColours}
                  teamColours={teamColours}
                  isCommissioner={isCommissioner}
                  isDraft={isDraft}
                  deletingId={deletingId}
                  round={round}
                  onDelete={handleDelete}
                  onChanged={onChanged}
                />
              ))}

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
                          hasGroups={round.groups.length > 1}
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
      <CompetitionsExplainerDialog
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
      />
    </div>
  );
}
