import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateRoundParticipant } from '@/lib/rounds';
import { handicapField } from '@/lib/validators';
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

const updateRoundHandicapSchema = z.object({
  roundParticipantId: z.string().uuid(),
  handicapOverride: handicapField,
});

type UpdateRoundHandicapInput = z.infer<typeof updateRoundHandicapSchema>;

interface EditRoundHandicapDialogProps {
  roundParticipant: {
    id: string;
    handicapOverride: string | null;
    handicapSnapshot: string;
  };
  onSaved: () => void;
  trigger: ReactNode;
}

export function EditRoundHandicapDialog({
  roundParticipant,
  onSaved,
  trigger,
}: EditRoundHandicapDialogProps) {
  const [open, setOpen] = useState(false);
  const [updateRoundParticipant, { isPending: saving }] =
    useUpdateRoundParticipant();

  const form = useForm<UpdateRoundHandicapInput>({
    resolver: zodResolver(updateRoundHandicapSchema),
    defaultValues: {
      roundParticipantId: roundParticipant.id,
      handicapOverride: roundParticipant.handicapOverride
        ? parseFloat(roundParticipant.handicapOverride)
        : null,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        roundParticipantId: roundParticipant.id,
        handicapOverride: roundParticipant.handicapOverride
          ? parseFloat(roundParticipant.handicapOverride)
          : null,
      });
    }
  }, [open, roundParticipant, form]);

  const handleSubmit = async (data: UpdateRoundHandicapInput) => {
    await updateRoundParticipant({
      variables: {
        roundParticipantId: data.roundParticipantId,
        handicapOverride: data.handicapOverride ?? null,
      },
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
            roundParticipantId: roundParticipant.id,
            handicapOverride: roundParticipant.handicapOverride
              ? parseFloat(roundParticipant.handicapOverride)
              : null,
          });
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Round Handicap Override</DialogTitle>
          <DialogDescription>
            Override the handicap for this round only. Snapshot from tournament:{' '}
            {roundParticipant.handicapSnapshot}
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
                      placeholder={`Snapshot: ${roundParticipant.handicapSnapshot}`}
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
