import { createFileRoute } from '@tanstack/react-router';
import { SignupPage } from '@/components/pages';

export const Route = createFileRoute('/_auth/signup')({
  component: SignupPage,
});
