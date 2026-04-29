import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/app/app-layout';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { next: undefined } });
    }
    return { user: context.user };
  },
  component: AppRoute,
});

function AppRoute() {
  const { user } = Route.useRouteContext();
  return <AppLayout user={user} />;
}
