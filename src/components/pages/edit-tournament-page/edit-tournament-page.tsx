import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateTournament } from '@/lib/tournaments';
import {
  createTournamentSchema,
  type CreateTournamentInput,
} from '@/lib/validators';
import type { TournamentFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { toast } from 'sonner';

export function EditTournamentPage({
  tournament,
  isOwner,
}: {
  tournament: TournamentFormData;
  isOwner: boolean;
}) {
  const navigate = useNavigate();
  const [updateTournament, { isPending }] = useUpdateTournament();
  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: tournament.name,
      description: tournament.description ?? '',
    },
  });

  if (!isOwner) {
    return (
      <div className="py-12 text-center">
        <Text size="sm" color="muted">
          You don&apos;t have permission to edit this tournament.
        </Text>
      </div>
    );
  }

  const handleSubmit = async (data: CreateTournamentInput) => {
    await updateTournament({
      variables: { ...data, id: tournament.id },
      onSuccess: () => {
        toast.success('Tournament updated!');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId: tournament.id },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Heading level={1}>Edit Tournament</Heading>
        <Text size="sm" color="muted">
          Update the details for {tournament.name}.
        </Text>
      </div>

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Tournament Name</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigate({
                  to: '/tournaments/$tournamentId',
                  params: { tournamentId: tournament.id },
                })
              }
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
