import { createFileRoute } from '@tanstack/react-router';
import { getMyAccountFn } from '@/lib/persons.server';
import { AccountPage } from '@/components/pages';

export const Route = createFileRoute('/_app/account')({
  loader: async () => {
    const account = await getMyAccountFn();
    return { account };
  },
  component: function AccountRoute() {
    const { account } = Route.useLoaderData();
    return <AccountPage account={account} />;
  },
});
