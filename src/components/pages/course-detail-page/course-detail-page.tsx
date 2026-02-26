import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
        <Link to="/courses" className="hover:text-primary underline">
          ← Courses
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
            <Badge variant="secondary">{course.numberOfHoles} holes</Badge>
          </div>
          {course.location && (
            <p className="text-muted-foreground mt-1">📍 {course.location}</p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
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

      <Separator />

      <CourseScorecard holes={course.holes} />
    </div>
  );
}
