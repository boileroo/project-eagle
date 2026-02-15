import { createFileRoute } from '@tanstack/react-router';
import { getCourseFn } from '@/lib/courses.server';
import { EditCoursePage } from '@/components/pages';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/courses/$courseId/edit')({
  loader: async ({ params }) => {
    const course = await getCourseFn({ data: { courseId: params.courseId } });
    return { course };
  },
  component: function EditCourseRoute() {
    const { course } = Route.useLoaderData();
    const { user } = useAuth();
    return (
      <EditCoursePage
        course={course}
        isOwner={user?.id === course.createdByUserId}
      />
    );
  },
});
