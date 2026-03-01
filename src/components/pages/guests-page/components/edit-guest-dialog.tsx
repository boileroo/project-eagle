import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { GuestListItem } from '@/types';
import { useUpdateGuest } from '@/lib/tournaments';
import { updateGuestSchema, type UpdateGuestInput } from '@/lib/validators';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EditGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: GuestListItem | null;
}

export function EditGuestDialog({
  open,
  onOpenChange,
  guest,
}: EditGuestDialogProps) {
  const router = useRouter();
  const [updateGuest, { isPending }] = useUpdateGuest();

  const form = useForm<UpdateGuestInput>({
    resolver: zodResolver(updateGuestSchema),
    defaultValues: {
      personId: guest?.id ?? '',
      displayName: guest?.displayName ?? '',
      currentHandicap: guest?.currentHandicap
        ? parseFloat(guest.currentHandicap)
        : null,
    },
  });

  // Reset form when guest changes
  useEffect(() => {
    if (guest) {
      form.reset({
        personId: guest.id,
        displayName: guest.displayName,
        currentHandicap: guest.currentHandicap
          ? parseFloat(guest.currentHandicap)
          : null,
      });
    }
  }, [guest, form]);

  const handleSubmit = async (data: UpdateGuestInput) => {
    await updateGuest({
      variables: data,
      onSuccess: () => {
        toast.success('Guest updated');
        onOpenChange(false);
        router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Guest</DialogTitle>
          <DialogDescription>
            Update guest details for future tournaments
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentHandicap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handicap</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
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
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
