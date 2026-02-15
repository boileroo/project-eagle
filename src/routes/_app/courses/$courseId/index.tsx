import { createFileRoute } from '@tanstack/react-router';
import { getCourseFn } from '@/lib/courses.server';
import { CourseDetailPage } from '@/components/pages';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/courses/$courseId/')({
  loader: async ({ params }) => {
    const course = await getCourseFn({ data: { courseId: params.courseId } });
    return { course };
  },
  component: function CourseDetailRoute() {
    const { course } = Route.useLoaderData();
    const { user } = useAuth();
    return (
      <CourseDetailPage
        course={course}
        isOwner={user?.id === course.createdByUserId}
      />
    );
  },
});
