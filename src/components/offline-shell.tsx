import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { OfflineFallback } from '@/components/offline-fallback';

export function OfflineShell() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl">📴</div>
        <div className="space-y-2">
          <Heading level={1}>You are offline</Heading>
          <Text size="sm" color="muted">
            Aerie can keep scoring offline. If you opened this round recently,
            continue from your cached data.
          </Text>
        </div>
        <OfflineFallback roundId={null} tournamentId={null} />
        <div className="text-muted-foreground text-xs">
          Need to sign in?{' '}
          <Button variant="link" asChild className="px-1">
            <Link to="/login" search={{ next: undefined }}>
              Go online and sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
