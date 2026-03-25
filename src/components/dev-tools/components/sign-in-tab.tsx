import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { signInFn, signOutFn } from '@/lib/auth.server';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@/lib/dev/test-accounts';

interface SignInTabProps {
  currentTestUser: 'A' | 'B' | null;
  onSuccess: () => void;
}

export function SignInTab({ currentTestUser, onSuccess }: SignInTabProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const signInAs = async (key: 'A' | 'B') => {
    if (!TEST_PASSWORD) {
      toast.error('VITE_TEST_PASSWORD is not set');
      return;
    }

    setBusy(key);
    try {
      const result = await signInFn({
        data: { email: TEST_ACCOUNTS[key].email, password: TEST_PASSWORD },
      });
      if (result.error) throw new Error(result.error);
      toast.success(`Signed in as ${TEST_ACCOUNTS[key].displayName}`);
      onSuccess();
    } catch (err) {
      toast.error('Sign in failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy('out');
    try {
      await signOutFn();
      toast.success('Signed out');
      onSuccess();
    } catch (err) {
      toast.error('Sign out failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Sign in as
        </p>
        <div className="space-y-1">
          {(['A', 'B'] as const).map((key) => {
            const isActive = currentTestUser === key;
            return (
              <Button
                key={key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-full text-xs"
                disabled={busy !== null || isActive}
                onClick={() => signInAs(key)}
              >
                {busy === key
                  ? 'Signing in…'
                  : isActive
                    ? `${TEST_ACCOUNTS[key].displayName} (current)`
                    : `Sign in as ${TEST_ACCOUNTS[key].displayName}`}
              </Button>
            );
          })}
        </div>
      </div>

      {currentTestUser && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          disabled={busy !== null}
          onClick={signOut}
        >
          {busy === 'out' ? 'Signing out…' : 'Sign out'}
        </Button>
      )}

      {!TEST_PASSWORD && (
        <p className="text-muted-foreground text-[10px]">
          Set <code>VITE_TEST_PASSWORD</code> in your .env to enable quick sign
          in.
        </p>
      )}
    </div>
  );
}
