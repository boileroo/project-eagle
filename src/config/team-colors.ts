type TeamColor = {
  headerBg: string;
  pillClasses: string;
};

export const TEAM_COLORS: TeamColor[] = [
  {
    headerBg: 'bg-red-100',
    pillClasses: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    headerBg: 'bg-blue-100',
    pillClasses: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    headerBg: 'bg-orange-100',
    pillClasses: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    headerBg: 'bg-purple-100',
    pillClasses: 'bg-purple-100 text-purple-700 border-purple-200',
  },
];

export function getTeamColor(index: number): TeamColor {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}
