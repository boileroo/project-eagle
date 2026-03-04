import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function CompetitionsExplainerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Types of Competitions</DialogTitle>
          <DialogDescription>
            Learn about the different competition formats available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Games between individuals */}
          <div>
            <h4 className="font-semibold">Games Between Individuals</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Head-to-head or group games where players compete individually.
              Each player's score is calculated independently (e.g. Wolf, Six
              Point, Chair).
            </p>
          </div>

          {/* Matches between teams */}
          <div>
            <h4 className="font-semibold">Matches Between Teams</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Pairings or groups compete as teams. Team members' scores are
              combined or compared per hole (e.g. Best Ball, Hi-Lo, Rumble).
            </p>
          </div>

          {/* Bonus */}
          <div>
            <h4 className="font-semibold">Bonus Prizes</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Fun side prizes like Nearest the Pin or Longest Drive. These can
              optionally add bonus points to the individual stableford standings
              for an extra element of competition.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
