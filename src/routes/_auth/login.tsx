import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/pages';

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === 'string' ? search.next : undefined,
  }),
  component: LoginPage,
});
