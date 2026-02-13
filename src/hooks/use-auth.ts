import { useRouteContext } from '@tanstack/react-router';

/**
 * Returns the authenticated user from the router context.
 * Must be used inside the /_app layout (i.e. an authenticated route).
 */
export function useAuth() {
  const context = useRouteContext({ from: '/_app' });
  return { user: context.user };
}
