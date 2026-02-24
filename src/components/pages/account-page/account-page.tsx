import { AccountHeader } from './components/account-header';
import { AccountForm } from './components/account-form';

type AccountData = {
  profile: {
    email: string;
    displayName: string | null;
  };
  person: {
    currentHandicap: string | null;
  } | null;
};

export function AccountPage({ account }: { account: AccountData }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AccountHeader />
      <AccountForm account={account} />
    </div>
  );
}
