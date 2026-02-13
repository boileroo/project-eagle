import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { getCourseFn, deleteCourseFn } from '@/lib/courses.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/courses/$courseId/')({
  loader: async ({ params }) => {
    const course = await getCourseFn({ data: { courseId: params.courseId } });
    return { course };
  },
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { course } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOwner = user?.id === course.createdByUserId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourseFn({ data: { courseId: course.id } });
      toast.success('Course deleted.');
      navigate({ to: '/courses' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete course',
      );
      setDeleting(false);
      setDialogOpen(false);
    }
  };

  const sortedHoles = [...(course.holes ?? [])].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );
  const totalPar = sortedHoles.reduce((sum, h) => sum + h.par, 0);

  return (
    <div className="space-y-6">
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete course?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete <strong>{course.name}</strong>{' '}
                    and all its hole data. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scorecard</span>
            <span className="text-muted-foreground text-sm font-normal">
              Par {totalPar}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedHoles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hole data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Hole</TableHead>
                    <TableHead className="w-16">Par</TableHead>
                    <TableHead className="w-16">SI</TableHead>
                    <TableHead className="w-20">Yards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHoles.map((hole) => (
                    <TableRow key={hole.id}>
                      <TableCell className="font-medium">
                        {hole.holeNumber}
                      </TableCell>
                      <TableCell>{hole.par}</TableCell>
                      <TableCell>{hole.strokeIndex}</TableCell>
                      <TableCell>
                        {hole.yardage != null ? hole.yardage : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
