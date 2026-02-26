import { useNavigate } from '@tanstack/react-router';
import { useUpdateCourse } from '@/lib/courses';
import { CourseForm } from '@/components/course-form';
import { type CreateCourseInput } from '@/lib/validators';
import { toast } from 'sonner';
import { type CourseData } from '@/types';

export function EditCoursePage({
  course,
  isOwner,
}: {
  course: CourseData;
  isOwner: boolean;
}) {
  const navigate = useNavigate();
  const [updateCourse, { isPending }] = useUpdateCourse();

  if (!isOwner) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have permission to edit this course.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: CreateCourseInput) => {
    await updateCourse({
      variables: { ...data, id: course.id },
      onSuccess: () => {
        toast.success('Course updated!');
        navigate({
          to: '/courses/$courseId',
          params: { courseId: course.id },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
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
        submitting={isPending}
      />
    </div>
  );
}
