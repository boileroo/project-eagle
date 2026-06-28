import { useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { getTournamentLeaderboardFn } from '@/lib/scoreboards.server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { LeaderboardData } from '@/types';
import { CompetitionOutcomesSection } from './components/competition-outcomes-section';
import { IndividualLeaderboardCards } from './components/individual-leaderboard-cards';
import { IndividualLeaderboardTable } from './components/individual-leaderboard-table';
import { LeaderboardEmptyState } from './components/leaderboard-empty-state';
import { LeaderboardSummaryBar } from './components/leaderboard-summary-bar';

export function LeaderboardSection({
  tournamentId,
  isCommissioner,
}: {
  tournamentId: string;
  isCommissioner: boolean;
}) {
  const { data } = useSuspenseQuery({
    queryKey: ['tournament-leaderboard', tournamentId],
    queryFn: () => getTournamentLeaderboardFn({ data: { tournamentId } }),
  });

  const leaderboard = data as LeaderboardData;
  const [sectionOpen, setSectionOpen] = useState(true);
  const [activeView, setActiveView] = useState<'individual' | 'competitions'>(
    'individual',
  );

  const finalisedRounds = leaderboard.rounds.filter(
    (round) => round.isFinalised,
  );
  const hasRows = leaderboard.rows.length > 0;
  const hasCompetitionContent =
    leaderboard.roundOutcomes.length > 0 ||
    leaderboard.teamLeaderboard.length > 0;

  const hasContributorBonuses = useMemo(
    () =>
      leaderboard.rows.some((row) => row.contributorBonusTotal > 0) ||
      leaderboard.rows.some((row) =>
        row.roundCells.some((cell) => (cell.contributorBonusTotal ?? 0) > 0),
      ),
    [leaderboard.rows],
  );

  const hasStandalones = useMemo(
    () =>
      leaderboard.rows.some((row) =>
        row.roundCells.some((cell) => cell.standaloneBadges.length > 0),
      ),
    [leaderboard.rows],
  );

  if (finalisedRounds.length === 0) {
    return (
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 select-none">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Leaderboard</span>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                    sectionOpen && 'rotate-180',
                  )}
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <LeaderboardEmptyState
                kind="no-finalised-rounds"
                isCommissioner={isCommissioner}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 select-none">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <span>Leaderboard</span>
                <Badge variant="secondary" className="text-xs font-normal">
                  {finalisedRounds.length} finalised round
                  {finalisedRounds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                  sectionOpen && 'rotate-180',
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 px-0 pb-0">
            <LeaderboardSummaryBar
              finalisedRounds={finalisedRounds.length}
              roundCount={leaderboard.rounds.length}
              primaryScoringBasis={leaderboard.scoringBasis}
              hasContributorBonuses={hasContributorBonuses}
              hasStandalones={hasStandalones}
            />

            {hasCompetitionContent && (
              <div className="px-6">
                <div className="inline-flex rounded-lg border p-1">
                  {[
                    { id: 'individual', label: 'Individuals' },
                    { id: 'competitions', label: 'Competitions' },
                  ].map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() =>
                        setActiveView(view.id as 'individual' | 'competitions')
                      }
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        activeView === view.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'individual' || !hasCompetitionContent ? (
              hasRows ? (
                <div className="space-y-4 pb-6">
                  <div className="hidden lg:block">
                    <IndividualLeaderboardTable
                      rows={leaderboard.rows}
                      rounds={leaderboard.rounds}
                      primaryScoringBasis={leaderboard.scoringBasis}
                    />
                  </div>
                  <div className="lg:hidden">
                    <IndividualLeaderboardCards
                      rows={leaderboard.rows}
                      primaryScoringBasis={leaderboard.scoringBasis}
                    />
                  </div>
                </div>
              ) : (
                <div className="px-6 pb-6">
                  <LeaderboardEmptyState
                    kind="no-complete-scores"
                    isCommissioner={isCommissioner}
                  />
                </div>
              )
            ) : (
              <div className="px-6 pb-6">
                <CompetitionOutcomesSection
                  roundOutcomes={leaderboard.roundOutcomes}
                  teamLeaderboard={leaderboard.teamLeaderboard}
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
