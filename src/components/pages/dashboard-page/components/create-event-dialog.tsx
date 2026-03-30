import { Link } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wand2, Settings2, Zap } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
}: CreateEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Choose how you want to set up your event.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
          <Link
            to="/tournaments/wizard"
            onClick={() => onOpenChange(false)}
            className="group border-primary/20 hover:border-primary/50 hover:bg-primary/5 flex items-start gap-4 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-2">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                Guided Setup{' '}
                <span className="text-primary bg-primary/10 ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                  Recommended
                </span>
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Step-by-step wizard to easily create a single round or full
                tournament.
              </p>
            </div>
          </Link>

          <Link
            to="/rounds/new"
            onClick={() => onOpenChange(false)}
            className="group hover:bg-muted border-border flex items-start gap-4 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-muted text-foreground group-hover:bg-background mt-0.5 rounded-full p-2">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Quick Round</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Jump straight into a single round without tournament overhead.
              </p>
            </div>
          </Link>

          <Link
            to="/tournaments/new"
            onClick={() => onOpenChange(false)}
            className="group hover:bg-muted border-border flex items-start gap-4 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-muted text-foreground group-hover:bg-background mt-0.5 rounded-full p-2">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Advanced Setup</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Manual configuration for complex multi-round tournaments.
              </p>
            </div>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
