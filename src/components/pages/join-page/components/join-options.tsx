import { Button } from '@/components/ui/button';
import { GuestClaimOption } from './guest-claim-option';

type ClaimableGuest = {
  personId: string;
  displayName: string;
  currentHandicap: string | null;
  teamName: string | null;
};

type JoinOptionsProps = {
  claimableGuests: ClaimableGuest[];
  selectedGuestPersonId: string | null;
  joining: boolean;
  onSelectGuest: (guestPersonId: string | null) => void;
  onJoin: () => Promise<void>;
};

export function JoinOptions({
  claimableGuests,
  selectedGuestPersonId,
  joining,
  onSelectGuest,
  onJoin,
}: JoinOptionsProps) {
  const joiningAsNewPlayer = selectedGuestPersonId == null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="space-y-1">
          <p className="font-medium">Join as a new player</p>
          <p className="text-muted-foreground text-sm">
            Choose this if you were not added as a guest yet.
          </p>
        </div>
        <Button
          variant={joiningAsNewPlayer ? 'default' : 'outline'}
          className="mt-4 w-full"
          onClick={() => onSelectGuest(null)}
          disabled={joining}
        >
          {joiningAsNewPlayer ? 'Selected' : 'Choose new player'}
        </Button>
      </div>

      {claimableGuests.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="font-medium">Claim an existing guest slot</p>
            <p className="text-muted-foreground text-sm">
              If the commissioner already added you as a guest, claim your slot
              to keep your team, group, and scheduled-round setup.
            </p>
          </div>
          <div className="space-y-2">
            {claimableGuests.map((guest) => (
              <GuestClaimOption
                key={guest.personId}
                guest={guest}
                selected={selectedGuestPersonId === guest.personId}
                disabled={joining}
                onSelect={onSelectGuest}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Button className="w-full" onClick={onJoin} disabled={joining}>
        {joining
          ? 'Joining...'
          : selectedGuestPersonId
            ? 'Claim guest slot'
            : 'Join tournament'}
      </Button>
    </div>
  );
}
