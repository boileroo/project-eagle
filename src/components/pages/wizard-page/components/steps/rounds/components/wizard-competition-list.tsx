import type { WizardCompetition } from '@/lib/validators';
import { FORMAT_TYPE_LABELS } from '@/lib/competition-config';
import { Button } from '@/components/ui/button';

const CATEGORY_LABELS: Record<
  WizardCompetition['competitionCategory'],
  string
> = {
  game: 'Game',
  match: 'Match',
  bonus: 'Bonus',
};

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
    <li className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{comp.name}</div>
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          <span>{FORMAT_TYPE_LABELS[comp.competitionConfig.formatType]}</span>
          <span>{CATEGORY_LABELS[comp.competitionCategory]}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => onRemove(index)}
      >
        Remove
      </Button>
    </li>
  );
}

export function WizardCompetitionList({
  competitions,
  onRemove,
}: WizardCompetitionListProps) {
  if (competitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        No competitions added yet.
      </p>
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
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Games &amp; Matches
            </p>
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
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Bonus
            </p>
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
