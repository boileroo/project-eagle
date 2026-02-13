import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useRouter,
} from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { signOutFn } from '@/lib/auth.server';

// Protected layout — all child routes require authentication
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' });
    } // Return the narrowed user so child routes get a non-null type
    return { user: context.user };
  },
  component: AppLayout,
});

const navLinks = [
  { to: '/' as const, label: 'Dashboard' },
  { to: '/courses' as const, label: 'Courses' },
  { to: '/tournaments' as const, label: 'Tournaments' },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              🦅 Project Eagle
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-muted-foreground hover:text-foreground [&.active]:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  activeOptions={{ exact: link.to === '/' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/account"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {user.email}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOutFn();
                await router.invalidate();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
