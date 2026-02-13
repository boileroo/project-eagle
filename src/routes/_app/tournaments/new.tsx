import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTournamentFn } from '@/lib/tournaments.server';
import {
  createTournamentSchema,
  type CreateTournamentInput,
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

export const Route = createFileRoute('/_app/tournaments/new')({
  component: NewTournamentPage,
});

function NewTournamentPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleSubmit = async (data: CreateTournamentInput) => {
    setSubmitting(true);
    try {
      const result = await createTournamentFn({ data });
      toast.success('Tournament created!');
      navigate({
        to: '/tournaments/$tournamentId',
        params: { tournamentId: result.tournamentId },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create tournament',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Tournament</h1>
        <p className="text-muted-foreground">
          Set up a new tournament. You can add players and rounds after creating
          it.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sunday Cup 2026"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Annual weekend tournament at Royal Melbourne"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
