import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { deleteCourseFn } from '@/lib/courses.server';
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
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourseFn({ data: { courseId } });
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
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
