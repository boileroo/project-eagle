import type { WizardCompetition } from '@/lib/validators';
import { FORMAT_TYPE_LABELS } from '@/lib/competition-config';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react';

interface WizardCompetitionListProps {
  competitions: WizardCompetition[];
  onRemove: (index: number) => void;
}

interface CompetitionItemProps {
  comp: WizardCompetition;
  index: number;
  onRemove: (index: number) => void;
}

function CompetitionItem({ comp, index, onRemove }: CompetitionItemProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{comp.name}</div>
        <div className="text-muted-foreground text-xs">
          {FORMAT_TYPE_LABELS[comp.competitionConfig.formatType]}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${comp.name}`}
        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

export function WizardCompetitionList({
  competitions,
  onRemove,
}: WizardCompetitionListProps) {
  if (competitions.length === 0) {
    return (
      <Text size="sm" color="muted" className="italic">
        No competitions added yet.
      </Text>
    );
  }

  const gamesAndMatches = competitions
    .map((c, i) => ({ comp: c, index: i }))
    .filter(({ comp }) => comp.competitionCategory !== 'bonus');

  const bonuses = competitions
    .map((c, i) => ({ comp: c, index: i }))
    .filter(({ comp }) => comp.competitionCategory === 'bonus');

  return (
    <div className="space-y-3">
      {gamesAndMatches.length > 0 && (
        <div className="space-y-1.5">
          {bonuses.length > 0 && (
            <Text
              size="xs"
              color="muted"
              weight="medium"
              className="tracking-wide uppercase"
            >
              Games &amp; Matches
            </Text>
          )}
          <ul className="space-y-1.5">
            {gamesAndMatches.map(({ comp, index }) => (
              <CompetitionItem
                key={index}
                comp={comp}
                index={index}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      )}
      {bonuses.length > 0 && (
        <div className="space-y-1.5">
          {gamesAndMatches.length > 0 && (
            <Text
              size="xs"
              color="muted"
              weight="medium"
              className="tracking-wide uppercase"
            >
              Bonus
            </Text>
          )}
          <ul className="space-y-1.5">
            {bonuses.map(({ comp, index }) => (
              <CompetitionItem
                key={index}
                comp={comp}
                index={index}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
