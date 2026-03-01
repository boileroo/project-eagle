import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateRound } from '@/lib/rounds';
import {
  createSingleRoundSchema,
  type CreateSingleRoundInput,
} from '@/lib/validators';
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

interface AddRoundDialogProps {
  tournamentId: string;
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
  onAdded: () => void;
}

export function AddRoundDialog({
  tournamentId,
  courses,
  onAdded,
}: AddRoundDialogProps) {
  const [open, setOpen] = useState(false);
  const [createRound, { isPending: adding }] = useCreateRound();

  const form = useForm<CreateSingleRoundInput>({
    resolver: zodResolver(createSingleRoundSchema),
    defaultValues: {
      courseId: '',
      date: '',
      teeTime: '',
    },
  });

  const handleSubmit = async (data: CreateSingleRoundInput) => {
    await createRound({
      variables: {
        tournamentId,
        courseId: data.courseId,
        date: data.date || undefined,
        teeTime: data.teeTime || undefined,
      },
      onSuccess: () => {
        toast.success('Round created! All tournament players have been added.');
        setOpen(false);
        form.reset();
        onAdded();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          form.reset();
        }
      }}
    >
      <div className="mt-2 flex justify-end">
        <DialogTrigger asChild>
          <Button size="sm">Add Round</Button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Round</DialogTitle>
          <DialogDescription>
            Select a course and optionally set a date and tee time. All current
            tournament players will be automatically added.
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
                    <Select {...field} className="h-9 py-1">
                      <option value="">Select a course…</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.numberOfHoles} holes)
                          {c.location ? ` — ${c.location}` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {courses.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                      No courses yet.{' '}
                      <Link
                        to="/courses/new"
                        className="text-primary underline"
                      >
                        Create one first
                      </Link>
                      .
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
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
                type="submit"
                disabled={adding || !form.formState.isValid}
              >
                {adding ? 'Creating…' : 'Create Round'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
