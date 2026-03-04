import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createSingleRoundSchema,
  type CreateSingleRoundInput,
} from '@/lib/validators';
import type { CourseListSummary } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NewRoundFormProps {
  courses: CourseListSummary[];
  onSubmit: (data: CreateSingleRoundInput) => Promise<void>;
  submitting: boolean;
  onCancel: () => void;
}

export function NewRoundForm({
  courses,
  onSubmit,
  submitting,
  onCancel,
}: NewRoundFormProps) {
  const form = useForm<CreateSingleRoundInput>({
    resolver: zodResolver(createSingleRoundSchema),
    defaultValues: {
      courseId: '',
      date: new Date().toISOString().split('T')[0],
      teeTime: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <div className="flex items-baseline justify-between gap-3">
                    <FormLabel required>Course</FormLabel>
                    <Button variant="link" size="sm" asChild className="px-0">
                      <a href="/courses/new">Add Course</a>
                    </Button>
                  </div>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Select a course…</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.numberOfHoles} holes)
                        </option>
                      ))}
                    </Select>
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Round'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
