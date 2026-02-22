import { Link, useNavigate } from '@tanstack/react-router';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Clock,
  PlayCircle,
  CheckCircle,
  Lock,
} from 'lucide-react';
import {
  getRoundFn,
  deleteRoundFn,
  transitionRoundFn,
} from '@/lib/rounds.server';
import { deleteTournamentFn, getTournamentFn } from '@/lib/tournaments.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { useQueryClient } from '@tanstack/react-query';
import { Scorecard } from '@/components/scorecard';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  EditRoundDialog,
  PlayersAndGroupsSection,
  TeamCompetitionsSection,
  IndividualScoreboardSection,
  SingleRoundPlayersSection,
} from '@/components/round-detail';
import {
  statusColors,
  statusLabels,
  nextTransitions,
} from '@/components/round-detail/constants';
import { buildTeamColourMap } from '@/lib/team-colours';
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

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type RoundData = Awaited<ReturnType<typeof getRoundFn>>;
type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
type CompetitionsData = Awaited<ReturnType<typeof getRoundCompetitionsFn>>;
type TournamentData = Awaited<ReturnType<typeof getTournamentFn>>;

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────

export function RoundDetailPage({
  round,
  courses,
  scorecard,
  competitions,
  tournament,
  myPerson,
  userId,
}: {
  round: RoundData;
  courses: Awaited<
    ReturnType<typeof import('@/lib/courses.server').getCoursesFn>
  >;
  scorecard: ScorecardData;
  competitions: CompetitionsData;
  tournament: TournamentData | null;
  myPerson: { id: string } | null;
  userId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const invalidateRoundData = () => {
    void queryClient.invalidateQueries({ queryKey: ['round', round.id] });
    void queryClient.invalidateQueries({
      queryKey: ['competition', 'round', round.id],
    });
    if (isSingleRound) {
      void queryClient.invalidateQueries({
        queryKey: ['tournament', round.tournamentId],
      });
    }
  };

  const isDraft = round.status === 'draft';
  const isScheduled = round.status === 'scheduled';
  const isSingleRound = round.tournament?.isSingleRound ?? false;

  // Score entry dialog state
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<{
    roundParticipantId: string;
    holeNumber: number;
    currentStrokes?: number;
    participantName: string;
    par: number;
  } | null>(null);

  // Determine if current user is commissioner of this tournament
  const isCommissioner = round.participants.some(
    (rp) =>
      rp.person.userId === userId &&
      rp.tournamentParticipant?.role === 'commissioner',
  );

  // Determine the recording role for the current user
  const getRecordingRole = (
    roundParticipantId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    if (isCommissioner) return 'commissioner';
    const rp = round.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === userId) return 'player';
    return 'marker';
  };

  // Compute which participants the current user can edit scores for
  const editableParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (round.status !== 'open') return set;

    // Find the current user's tournament role
    const myRoundParticipant = round.participants.find(
      (rp) => rp.person.userId === userId,
    );
    const myTournamentRole = myRoundParticipant?.tournamentParticipant?.role;

    if (myTournamentRole === 'commissioner' || myTournamentRole === 'marker') {
      // Commissioners and markers can score everyone
      for (const rp of round.participants) {
        set.add(rp.id);
      }
    } else if (myRoundParticipant) {
      // Regular players can only score their own card
      set.add(myRoundParticipant.id);
    }
    // Non-participants get an empty set (no editing)
    return set;
  }, [round.participants, round.status, userId]);

  // Build participant team colour map (roundParticipantId → hex)
  const participantTeamColours = useMemo(() => {
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
    const pColours = new Map<string, string>();
    for (const rp of round.participants) {
      const teamId = rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id;
      if (teamId) {
        const colour = tColours.get(teamId);
        if (colour) pColours.set(rp.id, colour);
      }
    }
    return pColours;
  }, [round.participants]);

  // Compute match pairings per group from the match_play competition (if any)
  // and hi_lo team matches (if any). Used for scorecard grouping + running scores.
  type SectionPairing =
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

  const matchPairingsForGroups = useMemo(() => {
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
            groupScope: (matchComp.groupScope ?? 'all') as
              | 'all'
              | 'within_group',
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
      const config: CompetitionConfig = {
        formatType: 'hi_lo',
        config: (hiLoComp.configJson ?? {}) as CompetitionConfig['config'],
      } as CompetitionConfig;

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
                scoreLabel = `${match.teamA.name} ${match.totalPointsA} – ${match.teamB.name} ${match.totalPointsB}`;
              }
            }

            const pairing: SectionPairing = {
              kind: 'hi_lo',
              match,
              label: `${match.teamA.name} vs ${match.teamB.name} (Hi-Lo)`,
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
  }, [competitions, round, scorecard]);

  const tournamentId = round.tournamentId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isSingleRound) {
        await deleteTournamentFn({ data: { tournamentId } });
        toast.success('Round deleted.');
        navigate({ to: '/' });
      } else {
        await deleteRoundFn({ data: { roundId: round.id } });
        toast.success('Round deleted.');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId },
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete round',
      );
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTransition = async (
    newStatus: 'draft' | 'scheduled' | 'open' | 'finalized',
  ) => {
    try {
      await transitionRoundFn({ data: { roundId: round.id, newStatus } });
      toast.success(`Round status changed to ${statusLabels[newStatus]}.`);
      invalidateRoundData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change status',
      );
    }
  };

  const transitions = nextTransitions[round.status] ?? [];
  const backTransitions = transitions.filter((t) => t.direction === 'back');
  const forwardTransitions = transitions.filter(
    (t) => t.direction === 'forward',
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {!isSingleRound && (
            <div className="text-muted-foreground mb-1 text-sm">
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId }}
                className="hover:text-primary underline"
              >
                ← {round.tournament?.name ?? 'Tournament'}
              </Link>
            </div>
          )}
          {isSingleRound && (
            <div className="text-muted-foreground mb-1 text-sm">
              <Link to="/" className="hover:text-primary underline">
                ← Dashboard
              </Link>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {isSingleRound
              ? round.course.name
              : `Round ${round.roundNumber ?? '—'}`}
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-3">
            <Link
              to="/courses/$courseId"
              params={{ courseId: round.course.id }}
              className="hover:text-primary hover:underline"
            >
              @ {round.course.name}
            </Link>
            {round.date && (
              <span>
                {new Date(round.date).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {(round as { teeTime?: string | null }).teeTime && (
                  <> · {(round as { teeTime?: string | null }).teeTime}</>
                )}
              </span>
            )}
            <Badge variant={statusColors[round.status]}>
              {statusLabels[round.status]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Back transitions — left side */}
          {isCommissioner &&
            backTransitions.map((t) => (
              <Button
                key={t.status}
                size="sm"
                variant="outline"
                onClick={() =>
                  handleTransition(
                    t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
                  )
                }
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                {t.label}
              </Button>
            ))}

          {isCommissioner && isDraft && (
            <EditRoundDialog
              round={round}
              courses={courses}
              onSaved={() => invalidateRoundData()}
            />
          )}

          {isCommissioner && round.status === 'draft' && (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete round?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete Round{' '}
                    {round.roundNumber ?? '—'} and all its participants and
                    scores. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Forward transitions — right side */}
          {isCommissioner &&
            forwardTransitions.map((t) => (
              <Button
                key={t.status}
                size="sm"
                variant="default"
                onClick={() =>
                  handleTransition(
                    t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
                  )
                }
              >
                {t.label}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ))}
        </div>
      </div>

      <Separator />

      {/* Round step indicator */}
      <RoundStepIndicator status={round.status} />

      {/* Locked banner — shown when round is awaiting start */}
      {round.status === 'scheduled' && (
        <div className="bg-muted/50 flex items-start gap-3 rounded-md border px-4 py-3 text-sm">
          <Lock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Round is locked.</span>{' '}
            <span className="text-muted-foreground">
              No configuration changes are possible until the round is started.
            </span>
          </div>
        </div>
      )}

      {/* For single rounds: show tournament-level Players panel */}
      {isSingleRound && tournament && (
        <SingleRoundPlayersSection
          tournament={tournament}
          roundId={round.id}
          roundStatus={round.status}
          isCommissioner={isCommissioner}
          userId={userId}
          myPerson={myPerson}
          onChanged={() => invalidateRoundData()}
          defaultOpen={isDraft || isScheduled}
        />
      )}

      {/* Players & Groups — hidden for single rounds */}
      {!isSingleRound && (
        <PlayersAndGroupsSection
          round={round}
          isCommissioner={isCommissioner}
          userId={userId}
          onChanged={() => invalidateRoundData()}
          defaultOpen={isDraft || isScheduled}
        />
      )}

      {/* Quick Score button — shown when round is open and user can score */}
      {round.status === 'open' && editableParticipantIds.size > 0 && (
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link
              to="/tournaments/$tournamentId/rounds/$roundId/play"
              params={{ tournamentId, roundId: round.id }}
              search={{ hole: 1, group: undefined }}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Quick Score
            </Link>
          </Button>
        </div>
      )}

      {/* Scorecards — one per group, visible when round is open or finalized */}
      {round.status !== 'draft' &&
        round.status !== 'scheduled' &&
        round.participants.length > 0 &&
        (() => {
          const groups = round.groups ?? [];
          const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);

          const sections: {
            label: string;
            participants: typeof round.participants;
          }[] = [];
          for (const g of groups) {
            const groupParticipants = round.participants.filter(
              (rp) => rp.roundGroupId === g.id,
            );
            if (groupParticipants.length > 0) {
              sections.push({
                label: g.name ?? `Group ${g.groupNumber}`,
                participants: groupParticipants,
              });
            }
          }
          if (ungrouped.length > 0) {
            sections.push({ label: 'Ungrouped', participants: ungrouped });
          }
          if (sections.length === 0) {
            sections.push({
              label: 'Scorecard',
              participants: round.participants,
            });
          }

          const handleScoreClick = (
            rpId: string,
            holeNumber: number,
            currentStrokes?: number,
          ) => {
            const rp = round.participants.find((p) => p.id === rpId);
            const hole = round.course.holes.find(
              (h) => h.holeNumber === holeNumber,
            );
            if (!rp || !hole) return;
            setScoreTarget({
              roundParticipantId: rpId,
              holeNumber,
              currentStrokes,
              participantName: rp.person.displayName,
              par: hole.par,
            });
            setScoreDialogOpen(true);
          };

          return sections.map((section) => {
            const sectionGroupId =
              round.groups.find(
                (g) => (g.name ?? `Group ${g.groupNumber}`) === section.label,
              )?.id ?? 'ungrouped';
            const pairings = matchPairingsForGroups.get(sectionGroupId) ?? [];

            if (pairings.length > 0) {
              // Build set of paired participant IDs
              const pairedIds = new Set(
                pairings.flatMap((p) => {
                  if (p.kind === 'match') {
                    return [
                      p.match.playerA.roundParticipantId,
                      p.match.playerB.roundParticipantId,
                    ];
                  }
                  return p.participantIds;
                }),
              );
              const unpaired = section.participants.filter(
                (rp) => !pairedIds.has(rp.id),
              );

              return (
                <Card key={section.label}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-0 sm:p-6 sm:pt-0">
                    {pairings.map((pairing, i) => {
                      const pairingParticipants =
                        pairing.kind === 'match'
                          ? ([
                              section.participants.find(
                                (rp) =>
                                  rp.id ===
                                  pairing.match.playerA.roundParticipantId,
                              ),
                              section.participants.find(
                                (rp) =>
                                  rp.id ===
                                  pairing.match.playerB.roundParticipantId,
                              ),
                            ].filter(Boolean) as typeof section.participants)
                          : (pairing.participantIds
                              .map((id) =>
                                section.participants.find((rp) => rp.id === id),
                              )
                              .filter(Boolean) as typeof section.participants);

                      return (
                        <div key={i}>
                          <p className="text-muted-foreground mb-2 px-4 text-xs font-medium sm:px-0">
                            {pairing.label}
                            {pairing.scoreLabel
                              ? ` — ${pairing.scoreLabel}`
                              : ''}
                          </p>
                          <Scorecard
                            holes={round.course.holes}
                            participants={pairingParticipants}
                            scores={scorecard}
                            roundStatus={round.status}
                            onScoreClick={handleScoreClick}
                            editableParticipantIds={editableParticipantIds}
                            participantTeamColours={participantTeamColours}
                          />
                        </div>
                      );
                    })}
                    {unpaired.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-2 px-4 text-xs font-medium sm:px-0">
                          Other
                        </p>
                        <Scorecard
                          holes={round.course.holes}
                          participants={unpaired}
                          scores={scorecard}
                          roundStatus={round.status}
                          onScoreClick={handleScoreClick}
                          editableParticipantIds={editableParticipantIds}
                          participantTeamColours={participantTeamColours}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={section.label}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <Scorecard
                    holes={round.course.holes}
                    participants={section.participants}
                    scores={scorecard}
                    roundStatus={round.status}
                    onScoreClick={handleScoreClick}
                    editableParticipantIds={editableParticipantIds}
                    participantTeamColours={participantTeamColours}
                  />
                </CardContent>
              </Card>
            );
          });
        })()}

      {/* Score entry dialog */}
      {scoreTarget && (
        <ScoreEntryDialog
          open={scoreDialogOpen}
          onOpenChange={setScoreDialogOpen}
          roundId={round.id}
          roundParticipantId={scoreTarget.roundParticipantId}
          participantName={scoreTarget.participantName}
          holeNumber={scoreTarget.holeNumber}
          par={scoreTarget.par}
          currentStrokes={scoreTarget.currentStrokes}
          recordedByRole={getRecordingRole(scoreTarget.roundParticipantId)}
        />
      )}

      {/* Individual Scoreboard — shown when round is open or finalized */}
      {(round.status === 'open' || round.status === 'finalized') && (
        <IndividualScoreboardSection roundId={round.id} />
      )}

      {/* Team Competitions */}
      <TeamCompetitionsSection
        round={round}
        scorecard={scorecard}
        competitions={competitions}
        isCommissioner={isCommissioner}
        hasTeams={
          isSingleRound
            ? (tournament?.teams?.length ?? 0) > 0
            : round.participants.some(
                (rp) =>
                  (rp.tournamentParticipant?.teamMemberships?.length ?? 0) > 0,
              )
        }
        onChanged={() => invalidateRoundData()}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Round Step Indicator
// ──────────────────────────────────────────────

const ROUND_STEPS: {
  status: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { status: 'draft', label: 'Draft', Icon: Pencil },
  { status: 'scheduled', label: 'Awaiting Start', Icon: Clock },
  { status: 'open', label: 'In Play', Icon: PlayCircle },
  { status: 'finalized', label: 'Finished', Icon: CheckCircle },
];

const STATUS_ORDER = ['draft', 'scheduled', 'open', 'finalized'];

function RoundStepIndicator({ status }: { status: string }) {
  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-0">
      {ROUND_STEPS.map((step, idx) => {
        const isActive = step.status === status;
        const isPast = idx < currentIdx;
        const isLast = idx === ROUND_STEPS.length - 1;

        return (
          <div key={step.status} className="flex min-w-0 flex-1 items-center">
            {/* Step node */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isPast
                      ? 'border-primary/40 bg-primary/10 text-primary/60'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground/40',
                ].join(' ')}
              >
                <step.Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={[
                  'truncate text-center text-xs',
                  isActive
                    ? 'text-foreground font-medium'
                    : isPast
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div
                className={[
                  'mb-5 h-0.5 w-full flex-shrink',
                  idx < currentIdx ? 'bg-primary/40' : 'bg-muted-foreground/20',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
