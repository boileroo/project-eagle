import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { RouterContext } from './routes/__root';
import { getQueryClient } from './lib/query-client';
import { Button } from './components/ui/button';

// Must export getRouter — TanStack Start calls this
// to create a new router instance per request
export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPendingComponent: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    ),
    defaultErrorComponent: ({ error, reset }) => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            {error?.message ?? 'An unexpected error occurred.'}
          </p>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground mt-2">Page not found</p>
        </div>
      </div>
    ),
    context: {
      user: null,
      queryClient: getQueryClient(),
    } satisfies RouterContext,
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
