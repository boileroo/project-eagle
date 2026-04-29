import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { OfflineFallback } from '@/components/offline-fallback';

export function OfflineShell() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl">📴</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">You are offline</h1>
          <p className="text-muted-foreground text-sm">
            Aerie can keep scoring offline. If you opened this round recently,
            continue from your cached data.
          </p>
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
