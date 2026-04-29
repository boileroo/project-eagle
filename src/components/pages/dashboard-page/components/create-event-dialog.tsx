import { Link } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wand2, Settings2, Zap, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

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
      <DialogContent className="border-white/5 sm:max-w-xl">
        <DialogHeader className="mb-4 space-y-2">
          <DialogTitle asChild>
            <Heading level={2} color="red">
              Create Event
            </Heading>
          </DialogTitle>
          <DialogDescription asChild>
            <Text size="lg" color="muted">
              Choose how you want to set up your event.
            </Text>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Link
            to="/tournaments/wizard"
            onClick={() => onOpenChange(false)}
            className="group focus-visible:outline-none"
          >
            <Card
              isHoverable
              className="border-tokyo-blue/20 bg-tokyo-blue/5 hover:bg-tokyo-blue/10 flex flex-row items-center gap-5 p-5 text-left sm:p-6"
            >
              <div className="bg-tokyo-blue/20 text-tokyo-blue shrink-0 rounded-2xl p-3">
                <Wand2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Heading level={5} color="white" className="font-bold">
                    Guided Setup
                  </Heading>
                  <Text
                    size="xs"
                    asChild
                    className="bg-tokyo-blue text-background rounded-full px-2.5 py-0.5 font-bold tracking-widest uppercase"
                  >
                    <span>Recommended</span>
                  </Text>
                </div>
                <Text size="sm" color="muted" className="mt-1 leading-relaxed">
                  Step-by-step assistant to configure rules, players, and tee
                  times.
                </Text>
              </div>
              <ChevronRight className="text-tokyo-blue/50 group-hover:text-tokyo-blue h-5 w-5 shrink-0 transition-colors" />
            </Card>
          </Link>

          <Link
            to="/rounds/new"
            onClick={() => onOpenChange(false)}
            className="group focus-visible:outline-none"
          >
            <Card
              isHoverable
              className="flex flex-row items-center gap-5 border-white/5 bg-transparent p-5 text-left hover:bg-white/5 sm:p-6"
            >
              <div className="shrink-0 rounded-2xl bg-white/5 p-3 text-white">
                <Zap className="text-muted-foreground group-hover:text-foreground h-6 w-6 transition-colors" />
              </div>
              <div className="flex-1">
                <Heading level={5} color="white" className="font-bold">
                  Quick Round
                </Heading>
                <Text size="sm" color="muted" className="mt-1 leading-relaxed">
                  Start a casual round instantly with default club rules.
                </Text>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0 transition-colors" />
            </Card>
          </Link>

          <Link
            to="/tournaments/new"
            onClick={() => onOpenChange(false)}
            className="group focus-visible:outline-none"
          >
            <Card
              isHoverable
              className="flex flex-row items-center gap-5 border-white/5 bg-transparent p-5 text-left hover:bg-white/5 sm:p-6"
            >
              <div className="shrink-0 rounded-2xl bg-white/5 p-3 text-white">
                <Settings2 className="text-muted-foreground group-hover:text-foreground h-6 w-6 transition-colors" />
              </div>
              <div className="flex-1">
                <Heading level={5} color="white" className="font-bold">
                  Advanced Setup
                </Heading>
                <Text size="sm" color="muted" className="mt-1 leading-relaxed">
                  Full control over multi-day tournaments and complex handicaps.
                </Text>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0 transition-colors" />
            </Card>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
