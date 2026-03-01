import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateParticipant } from '@/lib/tournaments';
import {
  updateParticipantSchema,
  type UpdateParticipantInput,
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

interface EditHandicapDialogProps {
  participant: { id: string; handicapOverride: string | null };
  onSaved: () => void;
  trigger: ReactNode;
}

export function EditHandicapDialog({
  participant,
  onSaved,
  trigger,
}: EditHandicapDialogProps) {
  const [open, setOpen] = useState(false);
  const [updateParticipant, { isPending }] = useUpdateParticipant();

  const form = useForm<UpdateParticipantInput>({
    resolver: zodResolver(updateParticipantSchema),
    defaultValues: {
      participantId: participant.id,
      handicapOverride: participant.handicapOverride
        ? parseFloat(participant.handicapOverride)
        : null,
    },
  });

  const handleSubmit = async (data: UpdateParticipantInput) => {
    await updateParticipant({
      variables: data,
      onSuccess: () => {
        toast.success('Handicap override updated.');
        setOpen(false);
        onSaved();
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
        if (v) {
          form.reset({
            participantId: participant.id,
            handicapOverride: participant.handicapOverride
              ? parseFloat(participant.handicapOverride)
              : null,
          });
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Handicap Override</DialogTitle>
          <DialogDescription>
            Set a tournament-specific handicap. Leave blank to use the
            player&apos;s current handicap.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="handicapOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handicap</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 18.4"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                      autoFocus
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
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
