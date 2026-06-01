import { useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTournament } from '@/lib/tournaments';
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
} from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { toast } from 'sonner';

export function NewTournamentPage() {
  const navigate = useNavigate();
  const [createTournament, { isPending }] = useCreateTournament();

  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleSubmit = async (data: CreateTournamentInput) => {
    await createTournament({
      variables: data,
      onSuccess: (result) => {
        toast.success('Tournament created!');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId: result.tournamentId },
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
        <Heading level={1}>New Tournament</Heading>
        <Text size="sm" color="muted">
          Set up a new tournament. You can add players and rounds after creating
          it.
        </Text>
        <Text size="sm" color="muted" className="mt-1">
          Want a step-by-step walkthrough?{' '}
          <Link
            to="/tournaments/wizard"
            className="text-primary underline-offset-4 hover:underline"
          >
            Use the wizard →
          </Link>
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
                    <Input placeholder="e.g. Sunday Cup 2026" {...field} />
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: '/' })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
