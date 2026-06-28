import { useState, useMemo } from 'react';
import { CircleHelp } from 'lucide-react';
import { useDeleteGame } from '@/lib/games';
import { GAME_FORMAT_LABELS, isTeamFormat } from '@/lib/games';
import type { GameConfig } from '@/lib/games';
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
import {
  collectTeamPoints,
  type TeamPointsEntry,
} from '@/lib/domain/team-points';
import { useQuery } from '@tanstack/react-query';
import { getAllDecisionsFn } from '@/lib/decisions.server';
import { resolveEffectiveHandicap, getPlayingHandicap } from '@/lib/handicaps';
import { buildTeamColourMap } from '@/lib/team-colours';
import { CompetitionResults } from '@/components/shared/competition-results';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { EditCompetitionDialog } from './edit-competition-dialog';
import { ConfigureMatchesDialog } from './configure-matches-dialog';
import { AddIndividualCompDialog } from './add-individual-comp-dialog';
import { AddTeamCompDialog } from './add-team-comp-dialog';
import { AddBonusCompDialog } from './add-bonus-comp-dialog';
import { BonusCompRow } from './bonus-comp-row';
import { CompetitionsExplainerDialog } from './components/competitions-explainer-dialog';
import { TeamStandingsBanner } from './components/team-standings-banner';
import type {
  RoundData,
  ScorecardData,
  RoundGamesData,
  SideGamesData,
} from '../types';

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
  comp: RoundGamesData[number];
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
  const isWolf = comp.format === 'wolf';

  const { data: rawDecisions } = useQuery({
    queryKey: ['decisions', comp.id],
    queryFn: () => getAllDecisionsFn({ data: { gameId: comp.id } }),
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
        roundGroupId: (d.groupId as string | null) ?? null,
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
    const config: GameConfig = {
      formatType: comp.format as GameConfig['formatType'],
      config: (comp.config ?? {}) as GameConfig['config'],
    } as GameConfig;
    const input: CompetitionInput = {
      competition: {
        id: comp.id,
        name: comp.name,
        config,
        groupScope: 'within_group',
        roundGroupId: comp.groupId,
      },
      ...engineInputs,
      gameDecisions: isWolf ? gameDecisions : undefined,
    };

    try {
      if (engineInputs.groups.length > 0) {
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
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <Heading level={4}>{comp.name}</Heading>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">
              {GAME_FORMAT_LABELS[comp.format as GameConfig['formatType']] ??
                comp.format}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {isTeamFormat(comp.format as GameConfig['formatType'])
                ? 'Team Match'
                : 'Game'}
            </Badge>
          </div>
        </div>
        {isCommissioner && isDraft && (
          <div className="flex shrink-0 items-center gap-1">
            <EditCompetitionDialog comp={comp} onSaved={onChanged} />
            {comp.format === 'match_play' && (
              <ConfigureMatchesDialog
                comp={comp}
                players={round.players}
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
        <Text size="sm" color="muted">
          Unable to calculate results.
        </Text>
      ) : groupedResult.scope === 'within_group' &&
        groupedResult.results.length > 1 ? (
        <div className="space-y-4">
          {groupedResult.results.map((gr) => (
            <div key={gr.groupId}>
              <Text size="xs" color="muted" weight="medium" className="mb-1">
                {gr.groupName ?? `Group ${gr.groupNumber}`}
              </Text>
              <CompetitionResults
                result={gr.result}
                participantTeamColours={participantTeamColours}
                teamColours={teamColours}
                hideGroupHeaders
              />
            </div>
          ))}
          {groupedResult.combined && (
            <div>
              <Text size="xs" color="muted" weight="medium" className="mb-1">
                Combined
              </Text>
              <CompetitionResults
                result={groupedResult.combined}
                participantTeamColours={participantTeamColours}
                teamColours={teamColours}
              />
            </div>
          )}
        </div>
      ) : groupedResult.scope === 'within_group' ? (
        groupedResult.results[0] ? (
          <CompetitionResults
            result={groupedResult.results[0].result}
            participantTeamColours={participantTeamColours}
            teamColours={teamColours}
          />
        ) : (
          <Text size="sm" color="muted">
            Unable to calculate results.
          </Text>
        )
      ) : (
        <CompetitionResults
          result={groupedResult.result}
          participantTeamColours={participantTeamColours}
          teamColours={teamColours}
        />
      )}
    </div>
  );
}

export function TeamCompetitionsSection({
  round,
  scorecard,
  games,
  sideGames,
  isCommissioner,
  hasTeams,
  onChanged,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  games: RoundGamesData;
  sideGames: SideGamesData;
  isCommissioner: boolean;
  hasTeams: boolean;
  onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [deleteGame] = useDeleteGame();
  const isDraft = round.status === 'draft';

  const engineInputs = useMemo(() => {
    const holes: HoleData[] = round.course.holes.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      strokeIndex: h.strokeIndex,
    }));

    const participants: ParticipantData[] = round.players.map((rp) => {
      const effectiveHC = resolveEffectiveHandicap({
        handicapOverride: rp.handicapOverride,
        handicapSnapshot: rp.handicapSnapshot,
        tournamentParticipant: rp.player
          ? { handicapOverride: rp.player.handicapOverride }
          : null,
      });
      return {
        roundParticipantId: rp.id,
        personId: rp.person.id,
        displayName: rp.person.displayName,
        effectiveHandicap: effectiveHC,
        playingHandicap: getPlayingHandicap(effectiveHC),
        roundGroupId: rp.groupId ?? null,
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
      memberParticipantIds: round.players
        .filter((rp) => rp.groupId === g.id)
        .map((rp) => rp.id),
    }));

    const teamMap = new Map<
      string,
      { teamId: string; name: string; memberParticipantIds: string[] }
    >();
    for (const rp of round.players) {
      for (const tm of rp.player?.teamMemberships ?? []) {
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

  const { participantTeamColours, teamColours } = useMemo(() => {
    const teamMap = new Map<string, { id: string; createdAt: Date | string }>();
    for (const rp of round.players) {
      for (const tm of rp.player?.teamMemberships ?? []) {
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

    const pColours = new Map<string, string>();
    for (const rp of round.players) {
      const teamId = rp.player?.teamMemberships?.[0]?.team?.id;
      if (teamId) {
        const colour = tColours.get(teamId);
        if (colour) pColours.set(rp.id, colour);
      }
    }
    return { participantTeamColours: pColours, teamColours: tColours };
  }, [round.players]);

  const handleDelete = async (compId: string) => {
    setDeletingId(compId);
    await deleteGame({
      variables: { gameId: compId },
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

  const hasEnoughPlayers = round.players.length >= 2;

  const teamStandings = useMemo(() => {
    const isActive = round.status === 'open' || round.status === 'finalized';
    if (!isActive || engineInputs.teams.length < 2) return null;

    const TEAM_APPLICABLE = new Set(['best_ball', 'hi_lo', 'match_play']);
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

    for (const comp of games) {
      if (!TEAM_APPLICABLE.has(comp.format)) continue;

      const config: GameConfig = {
        formatType: comp.format as GameConfig['formatType'],
        config: (comp.config ?? {}) as GameConfig['config'],
      } as GameConfig;
      const input = {
        competition: {
          id: comp.id,
          name: comp.name,
          config,
          groupScope: 'within_group' as const,
          roundGroupId: comp.groupId,
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
  }, [round.status, engineInputs, games]);

  const { data: overallData } = useQuery({
    queryKey: ['tournament-team-points', round.tournamentId],
    queryFn: () =>
      import('@/lib/tournament-team-points.server').then((m) =>
        m.getTournamentTeamPointsFn({
          data: { tournamentId: round.tournamentId },
        }),
      ),
    staleTime: 30_000,
  });
  const overallTeamStandings =
    overallData && overallData.roundCount > 1
      ? overallData.standings
      : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Competitions</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExplainerOpen(true)}
              title="Learn about competition types"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </CardTitle>
          {isCommissioner && isDraft && (
            <div className="flex flex-wrap gap-2">
              <AddIndividualCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                round={round}
                hasTeams={hasTeams}
                onSaved={onChanged}
                disabled={hasTeams || !hasEnoughPlayers}
              />
              <AddTeamCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                round={round}
                games={games}
                onSaved={onChanged}
                disabled={!hasTeams || !hasEnoughPlayers}
              />
              <AddBonusCompDialog
                tournamentId={round.tournamentId}
                roundId={round.id}
                onSaved={onChanged}
                disabled={!hasEnoughPlayers}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {games.length === 0 && sideGames.length === 0 ? (
            <Text size="sm" color="muted">
              Individual scores (strokes + stableford) are automatically tracked
              and will be visible once the round is underway.
              {isCommissioner && isDraft && (
                <>
                  <br />
                  Use the above buttons to add additional games or matches.
                </>
              )}
            </Text>
          ) : (
            <div className="space-y-6">
              {teamStandings && (
                <TeamStandingsBanner
                  standings={teamStandings}
                  overallStandings={overallTeamStandings}
                  roundStatus={round.status as 'open' | 'finalized'}
                  teamColours={teamColours}
                />
              )}
              {games.map((comp) => (
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

              {sideGames.length > 0 && (
                <div>
                  <Heading level={4} className="mb-3">
                    Bonus Prizes
                  </Heading>
                  <div className="space-y-2">
                    {sideGames.map((sideGame) => (
                      <BonusCompRow
                        key={sideGame.id}
                        sideGame={sideGame}
                        players={round.players}
                        isCommissioner={isCommissioner}
                        onChanged={onChanged}
                      />
                    ))}
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
