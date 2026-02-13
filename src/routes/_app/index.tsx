import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/')({
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/courses"
          className="group bg-card hover:border-primary/50 hover:bg-accent rounded-lg border p-6 transition-colors"
        >
          <h2 className="text-card-foreground group-hover:text-primary mb-1 font-semibold">
            Courses
          </h2>
          <p className="text-muted-foreground text-sm">
            Browse and manage the course library
          </p>
        </Link>
        <div className="bg-card rounded-lg border p-6 opacity-50">
          <h2 className="text-card-foreground mb-1 font-semibold">
            Tournaments
          </h2>
          <p className="text-muted-foreground text-sm">
            Create and manage tournaments
          </p>
        </div>
        <div className="bg-card rounded-lg border p-6 opacity-50">
          <h2 className="text-card-foreground mb-1 font-semibold">
            Score Entry
          </h2>
          <p className="text-muted-foreground text-sm">
            Enter live scores during rounds
          </p>
        </div>
      </div>
    </div>
  );
}
