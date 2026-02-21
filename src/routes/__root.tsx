import type { ReactNode } from 'react';
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { DevTools } from '@/components/dev-tools';
import { PwaUpdateToast } from '@/components/pwa-update-toast';
import { getAuthUser } from '@/lib/auth.server';
import appCss from '@/styles/globals.css?url';
import { appleSplashScreens } from '@/lib/apple-splash';
import {
  getQueryClient,
  queryPersister,
  dehydrateOptions,
} from '@/lib/query-client';
import { setResponseHeaders } from '@tanstack/react-start/server';

export interface RouterContext {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    accessToken: string | null;
  } | null;
  queryClient: ReturnType<typeof getQueryClient>;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    if (typeof window === 'undefined') {
      setResponseHeaders({
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security':
          'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.supabase.co",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          'worker-src blob:',
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      });
    }
    const user = await getAuthUser();
    return { user };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#FAF9F6' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      { title: 'Aerie' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      {
        rel: 'icon',
        href: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ...appleSplashScreens,
    ],
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
        <PwaUpdateToast />
        <Outlet />
      </RootDocument>
    </PersistQueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background min-h-screen font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
        {import.meta.env.DEV && <DevTools />}
        {import.meta.env.DEV && (
          <TanStackRouterDevtools position="bottom-right" />
        )}
      </body>
    </html>
  );
}
