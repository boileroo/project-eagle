import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDeleteCourse } from '@/lib/courses';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DeleteCourseDialogProps {
  courseId: string;
  courseName: string;
}

export function DeleteCourseDialog({
  courseId,
  courseName,
}: DeleteCourseDialogProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteCourse, { isPending }] = useDeleteCourse();

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete course?</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{courseName}</strong> and all
            its hole data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              deleteCourse({
                variables: { courseId },
                onSuccess: () => {
                  toast.success('Course deleted.');
                  navigate({ to: '/courses' });
                },
                onError: (error) => {
                  toast.error(error.message);
                  setDialogOpen(false);
                },
              })
            }
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
