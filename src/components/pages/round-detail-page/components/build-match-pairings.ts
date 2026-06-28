import {
  calculateCompetitionResults,
  calculateGroupedResults,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
  type MatchResult,
  type HiLoMatchResult,
  type TeamData,
  type GroupData,
} from '@/lib/domain';
import { resolveEffectiveHandicap, getPlayingHandicap } from '@/lib/handicaps';
import type { GameConfig } from '@/lib/game-config';
import type { RoundData, ScorecardData, RoundGamesData } from '@/types';

export type SectionPairing =
  | {
      kind: 'match';
      match: MatchResult;
      label: string;
      scoreLabel: string;
    }
  | {
      kind: 'hi_lo';
      match: HiLoMatchResult;
      label: string;
      scoreLabel: string;
      participantIds: string[];
    };

/**
 * Computes match pairings per group from the match_play game (if any)
 * and hi_lo team matches (if any). Used for scorecard grouping + running scores.
 */
export function buildMatchPairings({
  round,
  scorecard,
  games,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  games: RoundGamesData;
}): Map<string, SectionPairing[]> {
  const result = new Map<string, SectionPairing[]>();

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

  const rpGroupMap = new Map<string, string>();
  for (const rp of round.players) {
    rpGroupMap.set(rp.id, rp.groupId ?? 'ungrouped');
  }

  const groups: GroupData[] = (round.groups ?? []).map((g) => ({
    roundGroupId: g.id,
    groupNumber: g.groupNumber,
    name: g.name ?? null,
    memberParticipantIds: round.players
      .filter((rp) => rp.groupId === g.id)
      .map((rp) => rp.id),
  }));

  // ── Match play ────────────────────────────────
  const matchGame = games.find((g) => g.format === 'match_play');
  if (matchGame) {
    const config: GameConfig = {
      formatType: 'match_play',
      config: (matchGame.config ?? {}) as Extract<
        GameConfig,
        { formatType: 'match_play' }
      >['config'],
    };

    let compResult;
    try {
      compResult = calculateCompetitionResults({
        competition: {
          id: matchGame.id,
          name: matchGame.name,
          config,
          groupScope: 'within_group',
          roundGroupId: matchGame.groupId ?? null,
        },
        holes,
        participants,
        scores,
      });
    } catch {
      compResult = null;
    }

    if (compResult?.type === 'match_play') {
      for (const match of compResult.result.matches) {
        const groupId =
          rpGroupMap.get(match.playerA.roundParticipantId) ?? 'ungrouped';
        let scoreLabel = '';
        if (match.holesCompleted > 0) {
          if (match.matchScore > 0) {
            scoreLabel = `${match.playerA.displayName} ${match.matchScore} UP`;
          } else if (match.matchScore < 0) {
            scoreLabel = `${match.playerB.displayName} ${Math.abs(match.matchScore)} UP`;
          } else {
            scoreLabel = 'A/S';
          }
        }
        const pairing: SectionPairing = {
          kind: 'match',
          match,
          label: `${match.playerA.displayName} vs ${match.playerB.displayName}`,
          scoreLabel,
        };
        const existing = result.get(groupId) ?? [];
        existing.push(pairing);
        result.set(groupId, existing);
      }
    }
  }

  // ── Hi-Lo ─────────────────────────────────────
  const hiLoGame = games.find((g) => g.format === 'hi_lo');
  if (hiLoGame) {
    const hiLoConfig = hiLoGame.config as Record<string, unknown> | undefined;
    const config: GameConfig = {
      formatType: 'hi_lo',
      config: {
        pointsPerWin:
          typeof hiLoConfig?.pointsPerWin === 'number'
            ? hiLoConfig.pointsPerWin
            : 1,
        pointsPerHalf:
          typeof hiLoConfig?.pointsPerHalf === 'number'
            ? hiLoConfig.pointsPerHalf
            : 0.5,
      },
    };

    // Build team data from player team memberships
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

    let groupedResult;
    try {
      groupedResult = calculateGroupedResults({
        competition: {
          id: hiLoGame.id,
          name: hiLoGame.name,
          config,
          groupScope: 'within_group',
          roundGroupId: hiLoGame.groupId ?? null,
        },
        holes,
        participants,
        scores,
        teams,
        groups,
      });
    } catch {
      groupedResult = null;
    }

    if (groupedResult?.scope === 'within_group') {
      for (const gr of groupedResult.results) {
        if (gr.result.type !== 'hi_lo') continue;
        for (const match of gr.result.result.matches) {
          const allParticipantIds = [
            ...participants
              .filter((p) =>
                teams
                  .find((t) => t.teamId === match.teamA.teamId)
                  ?.memberParticipantIds.includes(p.roundParticipantId),
              )
              .map((p) => p.roundParticipantId),
            ...participants
              .filter((p) =>
                teams
                  .find((t) => t.teamId === match.teamB.teamId)
                  ?.memberParticipantIds.includes(p.roundParticipantId),
              )
              .map((p) => p.roundParticipantId),
          ].filter((id) =>
            groups
              .find((g) => g.roundGroupId === gr.groupId)
              ?.memberParticipantIds.includes(id),
          );

          let scoreLabel = '';
          if (match.holesCompleted > 0) {
            if (match.totalPointsA === match.totalPointsB) {
              scoreLabel = 'A/S';
            } else {
              const teamAPlayers = match.teamAPlayers
                .map((p) => p.displayName)
                .join(' & ');
              const teamBPlayers = match.teamBPlayers
                .map((p) => p.displayName)
                .join(' & ');
              scoreLabel = `${teamAPlayers} ${match.totalPointsA} – ${teamBPlayers} ${match.totalPointsB}`;
            }
          }

          const teamAPlayers = match.teamAPlayers
            .map((p) => p.displayName)
            .join(' & ');
          const teamBPlayers = match.teamBPlayers
            .map((p) => p.displayName)
            .join(' & ');
          const pairing: SectionPairing = {
            kind: 'hi_lo',
            match,
            label: `${teamAPlayers} vs ${teamBPlayers} (Hi-Lo)`,
            scoreLabel,
            participantIds: allParticipantIds,
          };
          const existing = result.get(gr.groupId) ?? [];
          existing.push(pairing);
          result.set(gr.groupId, existing);
        }
      }
    }
  }

  return result;
}
