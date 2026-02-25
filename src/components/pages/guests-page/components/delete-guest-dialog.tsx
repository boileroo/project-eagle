import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { deleteGuestFn } from '@/lib/tournaments.server';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toast } from 'sonner';

interface Guest {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
}

interface DeleteGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
}

export function DeleteGuestDialog({
  open,
  onOpenChange,
  guest,
}: DeleteGuestDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!guest) return;
    setLoading(true);
    try {
      await deleteGuestFn({
        data: { personId: guest.id },
      });
      toast.success('Guest deleted');
      onOpenChange(false);
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
    setLoading(false);
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
      loading={loading}
      onConfirm={handleDelete}
    />
  );
}
