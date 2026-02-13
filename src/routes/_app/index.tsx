import { createFileRoute } from '@tanstack/react-router'

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
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-1 font-semibold text-card-foreground">
            Tournaments
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage tournaments
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-1 font-semibold text-card-foreground">
            Courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse the course library
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
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
