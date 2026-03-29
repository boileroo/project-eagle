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
          <div>
            <h4 className="font-semibold">Games (no teams)</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Individual competitions played within each group. Each group can
              have at most one game. Available when teams are not enabled.
            </p>
            <ul className="text-muted-foreground mt-1 list-inside list-disc text-sm">
              <li>
                <strong>Wolf</strong> — 4 players. Rotating wolf picks a partner
                or goes lone/blind-lone.
              </li>
              <li>
                <strong>Six Point</strong> — 3 players. 4/2/0 point distribution
                per hole.
              </li>
              <li>
                <strong>Chair</strong> — 2+ players. Best score takes the chair;
                holder earns points.
              </li>
              <li>
                <strong>Singles Match Play</strong> — 2-player pairings.
                Head-to-head match play.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Team Matches (teams enabled)</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Team-vs-team competitions. Exactly one team match type per round,
              applied uniformly across all groups. Each match produces team
              points that aggregate toward the tournament team standings.
            </p>
            <ul className="text-muted-foreground mt-1 list-inside list-disc text-sm">
              <li>
                <strong>Best Ball (Fourball)</strong> — 2v2. Each pair's best
                stableford per hole.
              </li>
              <li>
                <strong>Hi-Lo</strong> — 2v2. High ball + low ball sub-matches
                per hole.
              </li>
              <li>
                <strong>Rumble</strong> — 4 same-team players. Escalating
                contribution across holes.
              </li>
              <li>
                <strong>Singles Match Play</strong> — Cross-team 1v1 pairings.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Bonus Prizes</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Side prizes like Nearest the Pin or Longest Drive. Always
              available, spanning all players across all groups. Can optionally
              add bonus points to individual stableford standings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
