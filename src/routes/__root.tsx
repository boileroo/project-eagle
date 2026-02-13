/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@/components/ui/sonner';
import { getAuthUser } from '@/lib/auth.server';
import appCss from '@/styles/globals.css?url';

export interface RouterContext {
  user: { id: string; email: string } | null;
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
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
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
        <TanStackRouterDevtools position="bottom-right" />
      </body>
    </html>
  );
}
