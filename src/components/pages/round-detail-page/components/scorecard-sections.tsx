import { Link } from '@tanstack/react-router';
import { ChevronDown, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Scorecard } from '@/components/scorecard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SectionPairing } from './build-match-pairings';
import type { RoundData, ScorecardData } from '@/types';

interface ScorecardSectionsProps {
  round: RoundData;
  scorecard: ScorecardData;
  matchPairingsForGroups: Map<string, SectionPairing[]>;
  editableParticipantIds: Set<string>;
  participantTeamColours: Map<string, string>;
  onScoreClick: (
    rpId: string,
    holeNumber: number,
    currentStrokes?: number,
  ) => void;
  quickScoreProps?: { tournamentId: string; roundId: string };
}

export function ScorecardSections({
  round,
  scorecard,
  matchPairingsForGroups,
  editableParticipantIds,
  participantTeamColours,
  onScoreClick,
  quickScoreProps,
}: ScorecardSectionsProps) {
  if (
    round.status === 'draft' ||
    round.status === 'scheduled' ||
    round.participants.length === 0
  ) {
    return null;
  }

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
    sections.push({ label: 'Scorecard', participants: ungrouped });
  }
  if (sections.length === 0) {
    sections.push({
      label: 'Scorecard',
      participants: round.participants,
    });
  }

  return (
    <>
      {sections.map((section, sectionIdx) => {
        const sectionGroupId =
          round.groups.find(
            (g) => (g.name ?? `Group ${g.groupNumber}`) === section.label,
          )?.id ?? 'ungrouped';
        const pairings = matchPairingsForGroups.get(sectionGroupId) ?? [];

        const quickScoreButton =
          sectionIdx === 0 && quickScoreProps ? (
            <Button size="sm" asChild>
              <Link
                to="/tournaments/$tournamentId/rounds/$roundId/play"
                params={{
                  tournamentId: quickScoreProps.tournamentId,
                  roundId: quickScoreProps.roundId,
                }}
                search={{ hole: 1, group: undefined }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Quick Score
              </Link>
            </Button>
          ) : null;

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
            <Collapsible key={section.label} defaultOpen className="group">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{section.label}</span>
                      <div className="flex items-center gap-2">
                        {quickScoreButton}
                        <ChevronDown
                          className={cn(
                            'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                            'group-data-[state=open]:rotate-180',
                          )}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                            onScoreClick={onScoreClick}
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
                          onScoreClick={onScoreClick}
                          editableParticipantIds={editableParticipantIds}
                          participantTeamColours={participantTeamColours}
                        />
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        }

        return (
          <Collapsible key={section.label} defaultOpen className="group">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer select-none">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{section.label}</span>
                    <div className="flex items-center gap-2">
                      {quickScoreButton}
                      <ChevronDown
                        className={cn(
                          'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                          'group-data-[state=open]:rotate-180',
                        )}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <Scorecard
                    holes={round.course.holes}
                    participants={section.participants}
                    scores={scorecard}
                    roundStatus={round.status}
                    onScoreClick={onScoreClick}
                    editableParticipantIds={editableParticipantIds}
                    participantTeamColours={participantTeamColours}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </>
  );
}
