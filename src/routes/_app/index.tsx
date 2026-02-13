import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const { user } = Route.useRouteContext()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/courses"
          className="group rounded-lg border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <h2 className="mb-1 font-semibold text-card-foreground group-hover:text-primary">
            Courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse and manage the course library
          </p>
        </Link>
        <div className="rounded-lg border bg-card p-6 opacity-50">
          <h2 className="mb-1 font-semibold text-card-foreground">
            Tournaments
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage tournaments
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 opacity-50">
          <h2 className="mb-1 font-semibold text-card-foreground">
            Score Entry
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter live scores during rounds
          </p>
        </div>
      </div>
    </div>
  )
}
