import { ConfirmDialog } from '@/components/shared/confirm-dialog';

type LeaveTournamentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSingleRound: boolean;
  loading: boolean;
  onConfirm: () => Promise<void>;
};

export function LeaveTournamentDialog({
  open,
  onOpenChange,
  isSingleRound,
  loading,
  onConfirm,
}: LeaveTournamentDialogProps) {
  const itemLabel = isSingleRound ? 'round' : 'tournament';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Leave ${itemLabel}?`}
      description={`Are you sure you want to leave this ${itemLabel}? You will be removed from the participants list and taken back to the dashboard.`}
      confirmText="Leave"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
