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
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Outlet />
      </div>
    </div>
  );
}
