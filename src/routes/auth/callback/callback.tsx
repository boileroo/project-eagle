import { createFileRoute, redirect } from '@tanstack/react-router';
import { createSupabaseServerClient } from '@/lib/supabase.server';

export const Route = createFileRoute('/auth/callback')({
  loader: async ({ request }) => {
    const { supabase } = createSupabaseServerClient(request);

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        throw redirect({ to: next });
      }
    }

    throw redirect({ to: '/login' });
  },
});

export default function AuthCallback() {
  return null;
}
