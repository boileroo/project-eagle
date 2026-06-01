import { Link } from '@tanstack/react-router';
import type { CourseListSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export function CoursesPage({ courses }: { courses: CourseListSummary[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Courses</Heading>
          <Text size="sm" color="muted">
            Browse the course library or add a new course.
          </Text>
        </div>
        <Button asChild>
          <Link to="/courses/new">Add Course</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No courses yet. Add your first course to get started.
            </p>
            <Button asChild>
              <Link to="/courses/new">Add Course</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to="/courses/$courseId"
              params={{ courseId: course.id }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{course.name}</span>
                    <Badge variant="secondary">
                      {course.numberOfHoles} holes
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {course.location && (
                    <p className="text-muted-foreground text-sm">
                      📍 {course.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
