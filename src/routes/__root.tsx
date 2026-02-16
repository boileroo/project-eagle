/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Toaster } from '@/components/ui/sonner';
import { DevTools } from '@/components/dev-tools';
import { getAuthUser } from '@/lib/auth.server';
import appCss from '@/styles/globals.css?url';
import {
  getQueryClient,
  queryPersister,
  dehydrateOptions,
} from '@/lib/query-client';

export interface RouterContext {
  user: { id: string; email: string } | null;
  queryClient: ReturnType<typeof getQueryClient>;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const user = await getAuthUser();
    return { user };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Project Eagle' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        dehydrateOptions,
      }}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </PersistQueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background min-h-screen font-sans antialiased">
        {children}
        <Toaster />
        <Scripts />
        {import.meta.env.DEV && <DevTools />}
        <TanStackRouterDevtools position="bottom-right" />
      </body>
    </html>
  );
}
