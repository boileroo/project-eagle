import { createFileRoute } from '@tanstack/react-router';
import { getCoursesFn } from '@/lib/courses.server';
import { CoursesPage } from '@/components/pages';

export const Route = createFileRoute('/_app/courses/')({
  loader: async () => {
    const courses = await getCoursesFn();
    return { courses };
  },
  component: function CoursesRoute() {
    const { courses } = Route.useLoaderData();
    return <CoursesPage courses={courses} />;
  },
});
