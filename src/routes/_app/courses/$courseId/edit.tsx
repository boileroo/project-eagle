import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { getCourseFn, updateCourseFn } from '@/lib/courses.server';
import { CourseForm } from '@/components/course-form';
import { type CreateCourseInput } from '@/lib/validators';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/courses/$courseId/edit')({
  loader: async ({ params }) => {
    const course = await getCourseFn({ data: { courseId: params.courseId } });
    return { course };
  },
  component: EditCoursePage,
});

function EditCoursePage() {
  const { course } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (user?.id !== course.createdByUserId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have permission to edit this course.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: CreateCourseInput) => {
    setSubmitting(true);
    try {
      await updateCourseFn({ data: { ...data, id: course.id } });
      toast.success('Course updated!');
      navigate({ to: '/courses/$courseId', params: { courseId: course.id } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update course',
      );
      setSubmitting(false);
    }
  };

  const defaultValues: CreateCourseInput = {
    name: course.name,
    location: course.location ?? '',
    numberOfHoles: course.numberOfHoles as 9 | 18,
    holes: [...(course.holes ?? [])]
      .sort((a, b) => a.holeNumber - b.holeNumber)
      .map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par as 3 | 4 | 5 | 6,
        strokeIndex: h.strokeIndex,
        yardage: h.yardage ?? null,
      })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Course</h1>
        <p className="text-muted-foreground">
          Update the details for {course.name}.
        </p>
      </div>
      <CourseForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        submitting={submitting}
      />
    </div>
  );
}
