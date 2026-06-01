import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { WizardStep, WizardState, EventType } from './types';
import type { WizardPlayer, WizardRound, WizardTeam } from '@/lib/validators';
import { useCreateEvent } from '@/lib/wizard';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { StepIndicator } from './components/step-indicator';
import { EventTypeStep } from './components/steps/event-type-step';
import { TournamentDetailsStep } from './components/steps/tournament-details-step';
import { PlayersStep } from './components/steps/players-step';
import { TeamsStep } from './components/steps/teams-step';
import { RoundsStep } from './components/steps/rounds-step';
import { ReviewStep } from './components/steps/review-step';

interface WizardPageProps {
  courses: { id: string; name: string }[];
  creatorName: string | null;
}

function defaultRound(): WizardRound {
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    courseId: '',
    date: soon.toISOString().slice(0, 10),
    teeTime: `${pad(soon.getHours())}:${pad(soon.getMinutes())}`,
    competitions: [],
  };
}

function initialState(
  creatorName: string | null,
  eventType: EventType = 'single_round',
): WizardState {
  return {
    eventType,
    tournamentName: '',
    description: '',
    players: [{ displayName: creatorName ?? 'Player 1', currentHandicap: 0 }],
    teams: [],
    rounds: [defaultRound()],
  };
}

function stepsForEventType(eventType: EventType): WizardStep[] {
  if (eventType === 'single_round') {
    return ['event-type', 'players', 'teams', 'rounds', 'review'];
  }
  return ['event-type', 'details', 'players', 'teams', 'rounds', 'review'];
}

export function WizardPage({ courses, creatorName }: WizardPageProps) {
  const navigate = useNavigate();
  const [createEvent, { isPending }] = useCreateEvent();
  const [state, setState] = useState<WizardState>(() =>
    initialState(creatorName),
  );
  const [currentStep, setCurrentStep] = useState<WizardStep>('event-type');

  const steps = stepsForEventType(state.eventType);
  const currentIndex = steps.indexOf(currentStep);

  const goNext = () => {
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goBack = () => {
    const prev = steps[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const handleEventTypeChange = (eventType: EventType) => {
    setState(initialState(creatorName, eventType));
    setCurrentStep('event-type');
  };

  const handleSubmit = async () => {
    const tournamentName =
      state.tournamentName ||
      (state.eventType === 'single_round' ? 'Single Round' : 'Tournament');

    await createEvent({
      variables: {
        isSingleRound: state.eventType === 'single_round',
        tournamentName,
        description: state.description || undefined,
        players: state.players,
        teams: state.teams,
        rounds: state.rounds,
      },
      onSuccess: (result) => {
        toast.success('Event created!');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId: result.tournamentId },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Heading level={1}>Guided Setup</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Set up your event step by step.
        </Text>
      </div>

      <StepIndicator
        currentStep={currentStep}
        isSingleRound={state.eventType === 'single_round'}
      />

      <div>
        {currentStep === 'event-type' && (
          <EventTypeStep
            value={state.eventType}
            onChange={handleEventTypeChange}
            onNext={goNext}
          />
        )}

        {currentStep === 'details' && (
          <TournamentDetailsStep
            tournamentName={state.tournamentName}
            description={state.description}
            onChange={({ tournamentName, description }) =>
              setState((s) => ({ ...s, tournamentName, description }))
            }
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'players' && (
          <PlayersStep
            players={state.players}
            creatorName={creatorName}
            onChange={(players: WizardPlayer[]) =>
              setState((s) => ({ ...s, players }))
            }
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'teams' && (
          <TeamsStep
            players={state.players}
            teams={state.teams}
            onChange={(teams: WizardTeam[]) =>
              setState((s) => ({ ...s, teams }))
            }
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'rounds' && (
          <RoundsStep
            rounds={state.rounds}
            players={state.players}
            teams={state.teams}
            courses={courses}
            hasTeams={state.teams.length > 0}
            isSingleRound={state.eventType === 'single_round'}
            defaultRound={defaultRound}
            onChange={(rounds: WizardRound[]) =>
              setState((s) => ({ ...s, rounds }))
            }
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            state={state}
            courses={courses}
            isPending={isPending}
            onSubmit={handleSubmit}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}
