import { AccountHeader } from './components/account-header';
import { AccountForm } from './components/account-form';
import { type AccountData } from '@/types';

export function AccountPage({ account }: { account: AccountData }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AccountHeader />
      <AccountForm account={account} />
    </div>
  );
}
