import { Badge } from '@/components/ui/badge';
import { TrophyIcon } from '../trophy-icon';

const BASIS_LABELS: Record<string, string> = {
  gross_strokes: 'Gross',
  net_strokes: 'Net',
  stableford: 'Stableford',
  total: 'Total',
};

export function LeaderboardSummaryBar({
  finalisedRounds,
  roundCount,
  primaryScoringBasis,
  hasContributorBonuses,
  hasStandalones,
}: {
  finalisedRounds: number;
  roundCount: number;
  primaryScoringBasis: string | null;
  hasContributorBonuses: boolean;
  hasStandalones: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-6">
      {primaryScoringBasis && (
        <Badge variant="outline" className="gap-1 text-xs font-normal">
          <TrophyIcon className="h-3 w-3" />
          Primary basis:{' '}
          {BASIS_LABELS[primaryScoringBasis] ?? primaryScoringBasis}
        </Badge>
      )}
      <Badge variant="secondary" className="text-xs font-normal">
        Ranked by Stableford, then gross
      </Badge>
      <Badge variant="secondary" className="text-xs font-normal">
        {finalisedRounds} of {roundCount} rounds counting
      </Badge>
      {hasContributorBonuses && (
        <Badge variant="secondary" className="text-xs font-normal">
          Bonus points included in totals
        </Badge>
      )}
      {hasStandalones && (
        <Badge variant="secondary" className="text-xs font-normal">
          Standalone prizes shown per round
        </Badge>
      )}
    </div>
  );
}
