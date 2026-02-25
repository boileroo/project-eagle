import { useState } from 'react';

/**
 * Manages open/loading state for a confirm/delete dialog.
 *
 * Pass your async action to `handleConfirm`; loading resets automatically on
 * completion and the dialog closes on success. If the action throws, the
 * dialog stays open so the user can retry — the action is responsible for
 * displaying any error toast.
 *
 * @example
 * const { open, setOpen, loading, handleConfirm } = useConfirmDialog();
 *
 * const onDelete = () =>
 *   handleConfirm(async () => {
 *     await deleteFn({ data: { id } });
 *     toast.success('Deleted.');
 *     onDeleted();
 *   });
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
      setOpen(false);
    } catch {
      // Action is expected to handle its own error display (e.g. toast).
      // Leave the dialog open so the user can retry.
    } finally {
      setLoading(false);
    }
  };

  return { open, setOpen, loading, handleConfirm };
}
