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
import { toast } from 'sonner';

export function ShareDialog({
  tournamentName,
  inviteCode,
}: {
  tournamentName: string;
  inviteCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

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
          <Button onClick={copyLink} className="w-full">
            {copied ? 'Copied!' : 'Copy invite link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
