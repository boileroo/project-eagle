import type { ReactNode } from 'react';
import { useState } from 'react';
import { useUpdateParticipant } from '@/lib/tournaments';
import type { UpdateParticipantInput } from '@/lib/validators';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

interface ChangeRoleDialogProps {
  participantId: string;
  currentRole: string;
  playerName: string;
  onRoleChanged: () => void;
  trigger: ReactNode;
  disabled?: boolean;
  isLastCommissioner?: boolean;
  isCreator?: boolean;
}

export function ChangeRoleDialog({
  participantId,
  currentRole,
  playerName,
  onRoleChanged,
  trigger,
  disabled = false,
  isLastCommissioner = false,
  isCreator = false,
}: ChangeRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(currentRole);
  const [updateParticipant, { isPending }] = useUpdateParticipant();

  const handleRoleChange = async () => {
    if (selectedRole === currentRole) {
      setOpen(false);
      return;
    }

    const data: UpdateParticipantInput = {
      participantId,
      role: selectedRole as 'commissioner' | 'player',
    };

    await updateParticipant({
      variables: data,
      onSuccess: () => {
        const roleText =
          selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
        toast.success(`${playerName} is now a ${roleText.toLowerCase()}.`);
        setOpen(false);
        onRoleChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'commissioner':
        return 'Full control over tournament settings';
      case 'player':
        return 'Competes in the tournament';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setSelectedRole(currentRole);
        }
      }}
    >
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update {playerName}&apos;s role in the tournament.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select new role</label>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            disabled={isCreator}
          >
            <option value="commissioner">Commissioner</option>
            <option value="player">Player</option>
          </Select>
          <p className="text-muted-foreground text-xs">
            {getRoleDescription(selectedRole)}
          </p>

          {isCreator && (
            <p className="text-destructive text-xs font-medium">
              The tournament creator cannot be demoted.
            </p>
          )}

          {isLastCommissioner && selectedRole === 'player' && !isCreator && (
            <p className="text-destructive text-xs font-medium">
              This is the last commissioner. Promote another player to
              commissioner first.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRoleChange}
            disabled={
              isPending ||
              selectedRole === currentRole ||
              isCreator ||
              (isLastCommissioner && selectedRole === 'player')
            }
          >
            {isPending ? 'Updating…' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
