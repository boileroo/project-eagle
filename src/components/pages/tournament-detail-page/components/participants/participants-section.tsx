import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PlayersTab } from './players-tab';
import { TeamsTab } from '../teams/teams-tab';
import { GroupsTab } from '../groups/groups-tab';
import type { TournamentLoaderData, RoundData, CompetitionData } from '@/types';

type ParticipantsSectionProps = {
  tournament?: TournamentLoaderData;
  round?: RoundData;
  isSingleRound?: boolean;
  competitions?: CompetitionData[];
  isCommissioner: boolean;
  userId: string;
  myPerson?: { id: string } | null;
  onChanged: () => void;
  defaultOpen?: boolean;
};

export function ParticipantsSection({
  tournament,
  round,
  isSingleRound = false,
  competitions,
  isCommissioner,
  userId,
  myPerson,
  onChanged,
  defaultOpen = true,
}: ParticipantsSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'groups'>(
    'players',
  );

  const hasTournament = !!tournament;
  const hasTeams = hasTournament && (tournament.teams.length > 0 || true);
  const hasGroups = !!round;

  const tabs: { id: 'players' | 'teams' | 'groups'; label: string }[] = [];
  if (hasTournament) tabs.push({ id: 'players', label: 'Players' });
  if (hasTeams) tabs.push({ id: 'teams', label: 'Teams' });
  if (hasGroups) tabs.push({ id: 'groups', label: 'Groups' });

  const roundStatus = round?.status ?? 'draft';
  const isDraft = roundStatus === 'draft';

  const canEditPlayers =
    isCommissioner && (!round || (isSingleRound && isDraft));
  const canEditTeams = isCommissioner && (!round || (isSingleRound && isDraft));
  const canEditGroups = isCommissioner && round && isDraft;

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between">
              <span>Participants</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {hasTournament && tournament.participants.length > 0
                    ? `${tournament.participants.length} player${tournament.participants.length !== 1 ? 's' : ''}`
                    : round?.participants.length
                      ? `${round.participants.length} player${round.participants.length !== 1 ? 's' : ''}`
                      : 'No participants'}
                </Badge>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                    sectionOpen && 'rotate-180',
                  )}
                />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {tabs.length > 1 && (
              <div className="mb-4 flex border-b">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-primary text-primary border-b-2'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-[200px]">
              {activeTab === 'players' && (
                <PlayersTab
                  tournament={tournament}
                  round={round}
                  canEdit={canEditPlayers}
                  userId={userId}
                  myPerson={myPerson}
                  roundStatus={roundStatus}
                  onChanged={onChanged}
                />
              )}
              {activeTab === 'teams' && (
                <TeamsTab
                  tournament={tournament}
                  competitions={competitions}
                  canEdit={canEditTeams}
                  onChanged={onChanged}
                />
              )}
              {activeTab === 'groups' && round && (
                <GroupsTab
                  round={round}
                  canEdit={!!canEditGroups}
                  userId={userId}
                  onChanged={onChanged}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
