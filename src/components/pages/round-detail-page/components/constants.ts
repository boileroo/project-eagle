import type { CompetitionConfig } from '@/lib/competitions';

export const statusColors: Record<
  string,
  'default' | 'secondary' | 'outline' | 'warning' | 'success'
> = {
  draft: 'outline',
  scheduled: 'secondary',
  open: 'warning',
  finalized: 'default',
};

export const statusLabels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Awaiting Start',
  open: 'In Play',
  finalized: 'Finished',
};

export const nextTransitions: Record<
  string,
  { label: string; status: string; direction: 'forward' | 'back' }[]
> = {
  draft: [
    { label: 'Mark Awaiting Start', status: 'scheduled', direction: 'forward' },
  ],
  scheduled: [
    { label: 'Back to Draft', status: 'draft', direction: 'back' },
    { label: 'Start Round', status: 'open', direction: 'forward' },
  ],
  open: [
    { label: 'Back to Awaiting Start', status: 'scheduled', direction: 'back' },
    { label: 'Finish Round', status: 'finalized', direction: 'forward' },
  ],
  finalized: [
    { label: 'Reopen for Corrections', status: 'open', direction: 'back' },
  ],
};

export const INDIVIDUAL_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'wolf', label: 'Wolf' },
  { value: 'six_point', label: 'Six Point' },
  { value: 'chair', label: 'Chair' },
];

export const TEAM_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'match_play', label: 'Singles' },
  { value: 'best_ball', label: 'Best Ball' },
  { value: 'hi_lo', label: 'Hi-Lo' },
  { value: 'rumble', label: 'Rumble' },
];

export const BONUS_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'nearest_pin', label: 'Nearest the Pin' },
  { value: 'longest_drive', label: 'Longest Drive' },
];
