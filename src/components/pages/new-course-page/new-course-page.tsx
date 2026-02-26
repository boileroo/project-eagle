import { useNavigate } from '@tanstack/react-router';
import { useCreateCourse } from '@/lib/courses';
import { CourseForm } from '@/components/course-form';
import { type CreateCourseInput } from '@/lib/validators';
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
        <h1 className="text-3xl font-bold tracking-tight">New Course</h1>
        <p className="text-muted-foreground">
          Add a new course to the library.
        </p>
      </div>
      <CourseForm
        onSubmit={handleSubmit}
        submitLabel="Create Course"
        submitting={isPending}
      />
    </div>
  );
}
