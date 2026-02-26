import { Scorecard } from '@/components/scorecard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

export function ScorecardSections({
  round,
  scorecard,
  matchPairingsForGroups,
  editableParticipantIds,
  participantTeamColours,
  onScoreClick,
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
      {sections.map((section) => {
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
                        {pairing.scoreLabel ? ` — ${pairing.scoreLabel}` : ''}
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
                onScoreClick={onScoreClick}
                editableParticipantIds={editableParticipantIds}
                participantTeamColours={participantTeamColours}
              />
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
