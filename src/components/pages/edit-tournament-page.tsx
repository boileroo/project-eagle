import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateTournamentFn } from '@/lib/tournaments.server';
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

type TournamentData = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string | null;
};

export function EditTournamentPage({
  tournament,
  isOwner,
}: {
  tournament: TournamentData;
  isOwner: boolean;
}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!isOwner) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have permission to edit this tournament.
        </p>
      </div>
    );
  }

  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: tournament.name,
      description: tournament.description ?? '',
    },
  });

  const handleSubmit = async (data: CreateTournamentInput) => {
    setSubmitting(true);
    try {
      await updateTournamentFn({ data: { ...data, id: tournament.id } });
      toast.success('Tournament updated!');
      navigate({
        to: '/tournaments/$tournamentId',
        params: { tournamentId: tournament.id },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update tournament',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Tournament</h1>
        <p className="text-muted-foreground">
          Update the details for {tournament.name}.
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
                      <Input {...field} />
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
                      <Input {...field} />
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
              {submitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
