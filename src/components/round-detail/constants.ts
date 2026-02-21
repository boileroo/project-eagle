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
  { label: string; status: string }[]
> = {
  draft: [{ label: 'Mark Awaiting Start', status: 'scheduled' }],
  scheduled: [
    { label: 'Start Round', status: 'open' },
    { label: 'Back to Draft', status: 'draft' },
  ],
  open: [
    { label: 'Finish Round', status: 'finalized' },
    { label: 'Back to Awaiting Start', status: 'scheduled' },
  ],
  finalized: [{ label: 'Reopen for Corrections', status: 'open' }],
};

export const INDIVIDUAL_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'stableford', label: 'Stableford' },
  { value: 'stroke_play', label: 'Stroke Play' },
  { value: 'match_play', label: 'Match Play' },
];

export const TEAM_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'match_play', label: 'Match Play' },
  { value: 'best_ball', label: 'Best Ball' },
];

export const BONUS_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'nearest_pin', label: 'Nearest the Pin' },
  { value: 'longest_drive', label: 'Longest Drive' },
];
