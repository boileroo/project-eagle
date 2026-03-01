import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateRound } from '@/lib/rounds';
import { updateRoundSchema, type UpdateRoundInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

interface EditRoundDialogProps {
  round: {
    id: string;
    courseId: string | null;
    date: string | Date | null;
    teeTime?: string | null;
  };
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
  onSaved: () => void;
}

export function EditRoundDialog({
  round,
  courses,
  onSaved,
}: EditRoundDialogProps) {
  const [open, setOpen] = useState(false);
  const [updateRound, { isPending: saving }] = useUpdateRound();

  const form = useForm<UpdateRoundInput>({
    resolver: zodResolver(updateRoundSchema),
    defaultValues: {
      id: round.id,
      courseId: round.courseId ?? undefined,
      date: round.date
        ? new Date(round.date).toISOString().split('T')[0]
        : undefined,
      teeTime: round.teeTime ?? undefined,
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      form.reset({
        id: round.id,
        courseId: round.courseId ?? undefined,
        date: round.date
          ? new Date(round.date).toISOString().split('T')[0]
          : undefined,
        teeTime: round.teeTime ?? undefined,
      });
    }
    setOpen(next);
  };

  const handleSubmit = async (data: UpdateRoundInput) => {
    await updateRound({
      variables: data,
      onSuccess: () => {
        toast.success('Round updated.');
        setOpen(false);
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Round</DialogTitle>
          <DialogDescription>
            Change the course, date, or tee time for this round.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Course</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? e.target.value : undefined,
                        )
                      }
                    >
                      <option value="" disabled>
                        Select a course
                      </option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.numberOfHoles}h)
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teeTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tee Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.formState.isValid}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
