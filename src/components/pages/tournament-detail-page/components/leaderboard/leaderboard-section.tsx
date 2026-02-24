import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getTournamentLeaderboardFn } from '@/lib/competitions.server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrophyIcon } from './trophy-icon';
import { LeaderboardTable } from './leaderboard-table';

type LeaderboardData = Awaited<ReturnType<typeof getTournamentLeaderboardFn>>;

export function LeaderboardSection({ tournamentId }: { tournamentId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['tournament-leaderboard', tournamentId],
    queryFn: () => getTournamentLeaderboardFn({ data: { tournamentId } }),
  });

  const [sectionOpen, setSectionOpen] = useState(true);

  const leaderboard = data as LeaderboardData;

  const finalisedRounds = leaderboard.rounds.filter((r) => r.isFinalised);
  const trophyCol = leaderboard.primaryScoringBasis;

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
              <p className="text-muted-foreground text-sm">
                Leaderboard will appear once at least one round is finalised.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  if (leaderboard.rows.length === 0) {
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
              <p className="text-muted-foreground text-sm">
                No complete round scores yet.
              </p>
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
                {trophyCol && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs font-normal"
                  >
                    <TrophyIcon className="h-3 w-3" />
                    {trophyCol}
                  </Badge>
                )}
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
          <CardContent className="p-0">
            <LeaderboardTable
              rows={leaderboard.rows}
              trophyCol={trophyCol ?? ''}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
