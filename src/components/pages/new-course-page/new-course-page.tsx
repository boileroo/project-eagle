import { useNavigate } from '@tanstack/react-router';
import { useCreateCourse } from '@/lib/courses';
import { CourseForm } from '@/components/course-form';
import { type CreateCourseInput } from '@/lib/validators';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { toast } from 'sonner';

export function NewCoursePage() {
  const navigate = useNavigate();
  const [createCourse, { isPending }] = useCreateCourse();

  const handleSubmit = async (data: CreateCourseInput) => {
    await createCourse({
      variables: data,
      onSuccess: (result) => {
        toast.success('Course created!');
        navigate({
          to: '/courses/$courseId',
          params: { courseId: result.courseId },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Heading level={1}>New Course</Heading>
        <Text size="sm" color="muted">
          Add a new course to the library.
        </Text>
      </div>
      <CourseForm
        onSubmit={handleSubmit}
        submitLabel="Create Course"
        submitting={isPending}
        onCancel={() => navigate({ to: '/courses' })}
      />
    </div>
  );
}
