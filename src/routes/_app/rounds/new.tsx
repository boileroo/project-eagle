import { createFileRoute } from '@tanstack/react-router';
import { getCoursesFn } from '@/lib/courses.server';
import { NewRoundPage } from '@/components/pages';

export const Route = createFileRoute('/_app/rounds/new')({
  loader: async () => {
    const courses = await getCoursesFn();
    return { courses };
  },
  component: function NewRoundRoute() {
    const { courses } = Route.useLoaderData();
    return <NewRoundPage courses={courses} />;
  },
});
