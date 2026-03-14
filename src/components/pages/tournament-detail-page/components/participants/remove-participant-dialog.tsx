import { ConfirmDialog } from '@/components/shared/confirm-dialog';

type RemoveParticipantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantName: string;
  isSingleRound: boolean;
  loading: boolean;
  onConfirm: () => Promise<void>;
};

export function RemoveParticipantDialog({
  open,
  onOpenChange,
  participantName,
  isSingleRound,
  loading,
  onConfirm,
}: RemoveParticipantDialogProps) {
  const itemLabel = isSingleRound ? 'round' : 'tournament';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove player?"
      description={`Are you sure you want to remove ${participantName} from this ${itemLabel}?`}
      confirmText="Remove"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
