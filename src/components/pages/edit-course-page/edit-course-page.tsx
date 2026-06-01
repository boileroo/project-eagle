import { useNavigate } from '@tanstack/react-router';
import { useUpdateCourse } from '@/lib/courses';
import { CourseForm } from '@/components/course-form';
import { type CreateCourseInput } from '@/lib/validators';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
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
        <Text size="sm" color="muted">
          You don&apos;t have permission to edit this course.
        </Text>
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
        <Heading level={1}>Edit Course</Heading>
        <Text size="sm" color="muted">
          Update the details for {course.name}.
        </Text>
      </div>
      <CourseForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        submitting={isPending}
        onCancel={() =>
          navigate({
            to: '/courses/$courseId',
            params: { courseId: course.id },
          })
        }
      />
    </div>
  );
}
