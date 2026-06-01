import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { type CourseData } from '@/types';
import { DeleteCourseDialog } from './components/delete-course-dialog';
import { CourseScorecard } from './components/course-scorecard';

export function CourseDetailPage({
  course,
  isOwner,
}: {
  course: CourseData;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-muted-foreground mb-1 text-sm">
        <Link to="/courses" className="underline">
          ← Courses
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Heading level={1}>{course.name}</Heading>
            <Badge variant="secondary">{course.numberOfHoles} holes</Badge>
          </div>
          {course.location && (
            <p className="text-muted-foreground mt-1">📍 {course.location}</p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link
                to="/courses/$courseId/edit"
                params={{ courseId: course.id }}
              >
                Edit
              </Link>
            </Button>
            <DeleteCourseDialog courseId={course.id} courseName={course.name} />
          </div>
        )}
      </div>

      <CourseScorecard holes={course.holes} />
    </div>
  );
}
