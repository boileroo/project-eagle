import type { WizardState } from '../../types';
import { GAME_FORMAT_LABELS } from '@/lib/game-config';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface ReviewStepProps {
  state: WizardState;
  courses: { id: string; name: string }[];
  isPending: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function ReviewStep({
  state,
  courses,
  isPending,
  onSubmit,
  onBack,
}: ReviewStepProps) {
  const getCourse = (id: string) =>
    courses.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heading level={2}>Review</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Check everything looks right before creating.
        </Text>
      </div>

      <section className="space-y-2">
        <Text
          size="sm"
          color="muted"
          weight="semibold"
          className="tracking-wide uppercase"
        >
          Event
        </Text>
        <div className="space-y-1 rounded-lg border px-4 py-3 text-sm">
          <div>
            <span className="font-medium">Type: </span>
            {state.eventType === 'single_round' ? 'Single Round' : 'Tournament'}
          </div>
          {state.eventType !== 'single_round' && (
            <div>
              <span className="font-medium">Name: </span>
              {state.tournamentName || (
                <em className="text-muted-foreground">Untitled</em>
              )}
            </div>
          )}
          {state.eventType !== 'single_round' && state.description && (
            <div>
              <span className="font-medium">Description: </span>
              {state.description}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <Text
          size="sm"
          color="muted"
          weight="semibold"
          className="tracking-wide uppercase"
        >
          Players ({state.players.length})
        </Text>
        <ul className="divide-y rounded-lg border text-sm">
          {state.players.map((p, i) => (
            <li key={i} className="flex items-center px-4 py-2">
              <span>
                {p.displayName}
                {i === 0 && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    (you)
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {state.teams.length > 0 && (
        <section className="space-y-2">
          <Text
            size="sm"
            color="muted"
            weight="semibold"
            className="tracking-wide uppercase"
          >
            Teams ({state.teams.length})
          </Text>
          <ul className="divide-y rounded-lg border text-sm">
            {state.teams.map((team, i) => (
              <li key={i} className="px-4 py-2">
                <span className="font-medium">{team.name}: </span>
                {team.playerIndices
                  .map(
                    (pi) =>
                      state.players[pi]?.displayName ?? `Player ${pi + 1}`,
                  )
                  .join(', ') || (
                  <em className="text-muted-foreground">No players assigned</em>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <Text
          size="sm"
          color="muted"
          weight="semibold"
          className="tracking-wide uppercase"
        >
          Rounds ({state.rounds.length})
        </Text>
        <div className="space-y-3">
          {state.rounds.map((round, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg border px-4 py-3 text-sm"
            >
              <div className="font-medium">Round {i + 1}</div>
              <div>
                <span className="font-medium">Course: </span>
                {getCourse(round.courseId)}
              </div>
              {round.date && (
                <div>
                  <span className="font-medium">Date: </span>
                  {new Date(round.date).toLocaleDateString()}
                </div>
              )}
              {round.teeTime && (
                <div>
                  <span className="font-medium">Tee Time: </span>
                  {round.teeTime}
                </div>
              )}
              {round.competitions.length > 0 && (
                <div>
                  <span className="font-medium">Competitions: </span>
                  {round.competitions
                    .map(
                      (c) =>
                        `${c.name} (${GAME_FORMAT_LABELS[c.competitionConfig.formatType]})`,
                    )
                    .join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={onSubmit}
          disabled={isPending}
        >
          {isPending ? 'Creating…' : 'Create Event'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onBack}
          disabled={isPending}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
