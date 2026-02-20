import { createFileRoute } from '@tanstack/react-router';
import { OfflineShell } from '@/components/offline-shell';

export const Route = createFileRoute('/offline')({
  component: OfflinePage,
});

function OfflinePage() {
  return <OfflineShell />;
}
