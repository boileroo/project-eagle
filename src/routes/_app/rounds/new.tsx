import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCoursesFn } from '@/lib/courses.server';
import { createSingleRoundFn } from '@/lib/rounds.server';
import {
  createSingleRoundSchema,
  type CreateSingleRoundInput,
} from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/rounds/new')({
  loader: async () => {
    const courses = await getCoursesFn();
    return { courses };
  },
  component: NewSingleRoundPage,
});

function NewSingleRoundPage() {
  const { courses } = Route.useLoaderData();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateSingleRoundInput>({
    resolver: zodResolver(createSingleRoundSchema),
    defaultValues: {
      courseId: '',
      date: new Date().toISOString().split('T')[0],
      teeTime: '',
    },
  });

  const handleSubmit = async (data: CreateSingleRoundInput) => {
    setSubmitting(true);
    try {
      const result = await createSingleRoundFn({ data });
      toast.success('Round created!');
      navigate({
        to: '/tournaments/$tournamentId/rounds/$roundId',
        params: {
          tournamentId: result.tournamentId,
          roundId: result.roundId,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create round',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Round</h1>
        <p className="text-muted-foreground">
          Start a single round. Pick a course and head straight to the
          scorecard.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              You need at least one course before creating a round.
            </p>
            <Button asChild>
              <a href="/courses/new">Add Course</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Round Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <FormControl>
                        <select
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          {...field}
                        >
                          <option value="">Select a course…</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.name} ({course.numberOfHoles} holes)
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Defaults to today if left blank.
                      </FormDescription>
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
                        <Input
                          type="time"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>Optional.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Round'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/' })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
