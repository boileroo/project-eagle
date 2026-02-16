import type { CompetitionConfig } from '@/lib/competitions';

export const statusColors: Record<string, 'default' | 'secondary' | 'outline'> =
  {
    draft: 'outline',
    open: 'secondary',
    finalized: 'default',
  };

export const statusLabels: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  finalized: 'Finalized',
};

export const nextTransitions: Record<
  string,
  { label: string; status: string }[]
> = {
  draft: [{ label: 'Open Round', status: 'open' }],
  open: [
    { label: 'Finalize', status: 'finalized' },
    { label: 'Back to Draft', status: 'draft' },
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
