import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { RouterContext } from './routes/__root';

// Must export getRouter — TanStack Start calls this
// to create a new router instance per request
export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
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
    } satisfies RouterContext,
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
