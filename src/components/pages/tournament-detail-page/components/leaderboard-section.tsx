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

// ──────────────────────────────────────────────
// Tournament Leaderboard Section
//
// Auto-computed individual leaderboard aggregated
// across all finalised rounds.
// ──────────────────────────────────────────────

type LeaderboardData = Awaited<ReturnType<typeof getTournamentLeaderboardFn>>;

const BASIS_LABELS: Record<string, string> = {
  gross_strokes: 'Gross',
  net_strokes: 'Net',
  stableford: 'Stableford',
  total: 'Total',
};

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function LeaderboardSection({ tournamentId }: { tournamentId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['tournament-leaderboard', tournamentId],
    queryFn: () => getTournamentLeaderboardFn({ data: { tournamentId } }),
  });

  const [sectionOpen, setSectionOpen] = useState(true);

  const leaderboard = data as LeaderboardData;

  const finalisedRounds = leaderboard.rounds.filter((r) => r.isFinalised);
  const trophyCol = leaderboard.primaryScoringBasis;

  const colClass = (col: string) =>
    trophyCol === col
      ? 'font-semibold text-foreground'
      : 'text-muted-foreground';

  if (finalisedRounds.length === 0) {
    return (
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none">
              <CardTitle className="flex items-center justify-between">
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
            <CardHeader className="cursor-pointer select-none">
              <CardTitle className="flex items-center justify-between">
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
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Leaderboard</span>
                {trophyCol && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs font-normal"
                  >
                    <TrophyIcon className="h-3 w-3" />
                    {BASIS_LABELS[trophyCol] ?? trophyCol}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground w-6 px-4 py-2 text-left font-medium">
                      #
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Player</th>
                    <th className="text-muted-foreground px-4 py-2 text-right font-medium">
                      Rnds
                    </th>
                    <th
                      className={`px-4 py-2 text-right font-medium ${colClass('gross_strokes')}`}
                    >
                      {trophyCol === 'gross_strokes' && (
                        <TrophyIcon className="mr-1 inline h-3 w-3" />
                      )}
                      Gross
                    </th>
                    <th
                      className={`px-4 py-2 text-right font-medium ${colClass('net_strokes')}`}
                    >
                      {trophyCol === 'net_strokes' && (
                        <TrophyIcon className="mr-1 inline h-3 w-3" />
                      )}
                      Net
                    </th>
                    <th
                      className={`px-4 py-2 text-right font-medium ${colClass('stableford')}`}
                    >
                      {trophyCol === 'stableford' && (
                        <TrophyIcon className="mr-1 inline h-3 w-3" />
                      )}
                      Stableford
                    </th>
                    <th
                      className={`px-4 py-2 text-right font-medium ${colClass('total')}`}
                    >
                      {trophyCol === 'total' && (
                        <TrophyIcon className="mr-1 inline h-3 w-3" />
                      )}
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((row) => (
                    <tr
                      key={row.personId}
                      className="hover:bg-muted/30 border-b last:border-0"
                    >
                      <td className="text-muted-foreground px-4 py-2 tabular-nums">
                        {row.rank}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {row.displayName}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                        {row.roundsPlayed}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${colClass('gross_strokes')}`}
                      >
                        {row.grossStrokes}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${colClass('net_strokes')}`}
                      >
                        {row.netStrokes}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${colClass('stableford')}`}
                      >
                        {row.stableford}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${colClass('total')}`}
                      >
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
