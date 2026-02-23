import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function InvitePanel({
  tournamentName,
  inviteCode,
}: {
  tournamentName: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invite Players</CardTitle>
        <CardDescription>
          Share this link to invite players to {tournamentName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Invite Code</label>
          <Input value={inviteCode} readOnly className="font-mono" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Invite Link</label>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="text-sm" />
            <Button onClick={copyToClipboard} variant="secondary">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
