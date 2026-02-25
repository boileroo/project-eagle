import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useClipboard } from '@/hooks/use-clipboard';

export function ShareDialog({
  tournamentName,
  inviteCode,
}: {
  tournamentName: string;
  inviteCode: string;
}) {
  const [open, setOpen] = useState(false);
  const { copy, copied } = useClipboard({
    successMessage: 'Link copied to clipboard',
  });
  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite players</DialogTitle>
          <DialogDescription>
            Share this code with players you want to invite to {tournamentName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold tracking-wider">
              {inviteCode}
            </p>
          </div>
          <Button onClick={() => copy(inviteUrl)} className="w-full">
            {copied ? 'Copied!' : 'Copy invite link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
