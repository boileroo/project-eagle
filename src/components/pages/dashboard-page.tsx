import { Link } from '@tanstack/react-router';

const cards = [
  {
    to: '/courses' as const,
    title: 'Courses',
    description: 'Browse and manage the course library',
    accent: 'bg-info',
    border: 'border-t-info',
    icon: '⛳',
  },
  {
    to: '/tournaments' as const,
    title: 'Tournaments',
    description: 'Create and manage tournaments',
    accent: 'bg-purple',
    border: 'border-t-purple',
    icon: '🏆',
  },
  {
    to: '/rounds/new' as const,
    title: 'Single Round',
    description: 'Jump straight into a round without tournament setup',
    accent: 'bg-coral',
    border: 'border-t-coral',
    icon: '🏌️',
  },
] as const;

export function DashboardPage({ userEmail }: { userEmail: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userEmail}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`group bg-card hover:bg-background rounded-lg border border-t-4 ${card.border} overflow-hidden transition-colors`}
          >
            <div className="p-6">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`${card.accent} flex h-9 w-9 items-center justify-center rounded-lg text-lg`}
                >
                  {card.icon}
                </span>
                <h2 className="text-card-foreground font-semibold">
                  {card.title}
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
