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
import type { CompetitionConfig } from '@/lib/competitions';
import type { RoundData, ScorecardData, RoundCompetitionsData } from '@/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Builder
// ──────────────────────────────────────────────

/**
 * Computes match pairings per group from the match_play competition (if any)
 * and hi_lo team matches (if any). Used for scorecard grouping + running scores.
 */
export function buildMatchPairings({
  round,
  scorecard,
  competitions,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: RoundCompetitionsData;
}): Map<string, SectionPairing[]> {
  const result = new Map<string, SectionPairing[]>();

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

  const rpGroupMap = new Map<string, string>();
  for (const rp of round.participants) {
    rpGroupMap.set(rp.id, rp.roundGroupId ?? 'ungrouped');
  }

  const groups: GroupData[] = (round.groups ?? []).map((g) => ({
    roundGroupId: g.id,
    groupNumber: g.groupNumber,
    name: g.name ?? null,
    memberParticipantIds: round.participants
      .filter((rp) => rp.roundGroupId === g.id)
      .map((rp) => rp.id),
  }));

  // ── Match play ────────────────────────────────
  const matchComp = competitions.find((c) => c.formatType === 'match_play');
  if (matchComp) {
    const config: CompetitionConfig = {
      formatType: 'match_play',
      config: (matchComp.configJson ?? {}) as CompetitionConfig['config'],
    } as CompetitionConfig;

    let compResult;
    try {
      compResult = calculateCompetitionResults({
        competition: {
          id: matchComp.id,
          name: matchComp.name,
          config,
          groupScope: (matchComp.groupScope ?? 'all') as 'all' | 'within_group',
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
  const hiLoComp = competitions.find((c) => c.formatType === 'hi_lo');
  if (hiLoComp) {
    const hiLoConfig = hiLoComp.configJson as
      | Record<string, unknown>
      | undefined;
    const config: CompetitionConfig = {
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

    // Build team data from tournament participant memberships
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

    let groupedResult;
    try {
      groupedResult = calculateGroupedResults({
        competition: {
          id: hiLoComp.id,
          name: hiLoComp.name,
          config,
          groupScope: 'within_group',
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
