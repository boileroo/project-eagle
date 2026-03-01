import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useJoinTournamentByCode } from '@/lib/tournaments';
import { joinByCodeSchema, type JoinByCodeInput } from '@/lib/validators';
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

interface JoinTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTournamentDialog({
  open,
  onOpenChange,
}: JoinTournamentDialogProps) {
  const navigate = useNavigate();
  const [joinTournament, { isPending }] = useJoinTournamentByCode();

  const form = useForm<JoinByCodeInput>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ code: '' });
    }
  }, [open, form]);

  const handleSubmit = async (data: JoinByCodeInput) => {
    await joinTournament({
      variables: data,
      onSuccess: (result) => {
        if (!result.alreadyJoined) {
          toast.success(`You've joined ${result.tournamentName}!`);
        }
        onOpenChange(false);
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId: result.tournamentId },
        });
      },
      onError: (err) => {
        form.setError('code', { message: err.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="group bg-card hover:bg-background w-full rounded-lg border p-6 text-left transition-colors">
          <h3 className="mb-1 font-semibold">Join Tournament</h3>
          <p className="text-muted-foreground text-sm">
            Enter a code to join an existing tournament
          </p>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Tournament</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by the tournament commissioner
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Invite Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. BIRDIE-12b7"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Joining...' : 'Join'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
