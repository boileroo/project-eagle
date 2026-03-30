import type { WizardPlayer, WizardRound, WizardTeam } from '@/lib/validators';

export type EventType = 'single_round' | 'tournament';

export interface WizardState {
  eventType: EventType;
  tournamentName: string;
  description: string;
  players: WizardPlayer[];
  teams: WizardTeam[];
  rounds: WizardRound[];
}

export type WizardStep =
  | 'event-type'
  | 'details'
  | 'players'
  | 'teams'
  | 'rounds'
  | 'review';
