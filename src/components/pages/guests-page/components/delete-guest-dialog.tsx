import { useRouter } from '@tanstack/react-router';
import type { GuestListItem } from '@/types';
import { useDeleteGuest } from '@/lib/tournaments';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toast } from 'sonner';

interface DeleteGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: GuestListItem | null;
}

export function DeleteGuestDialog({
  open,
  onOpenChange,
  guest,
}: DeleteGuestDialogProps) {
  const router = useRouter();
  const [deleteGuest, { isPending }] = useDeleteGuest();

  const handleDelete = async () => {
    if (!guest) return;
    await deleteGuest({
      variables: { personId: guest.id },
      onSuccess: () => {
        toast.success('Guest deleted');
        onOpenChange(false);
        router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Guest"
      description={
        guest
          ? `Are you sure you want to delete ${guest.displayName}? This will remove them from your list of guests, but their scores in existing tournaments will be preserved.`
          : ''
      }
      confirmText="Delete"
      variant="destructive"
      loading={isPending}
      onConfirm={handleDelete}
    />
  );
}
