import { createFileRoute } from '@tanstack/react-router';
import { NewCoursePage } from '@/components/pages';

export const Route = createFileRoute('/_app/courses/new')({
  component: NewCoursePage,
});
