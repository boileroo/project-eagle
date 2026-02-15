import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/components/pages';

export const Route = createFileRoute('/_app/')({
  component: function Home() {
    const { user } = Route.useRouteContext();
    return <DashboardPage userEmail={user.email!} />;
  },
});
