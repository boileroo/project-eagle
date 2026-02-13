import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

// Layout route for auth pages (login, signup)
// Redirects to home if the user is already authenticated
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
