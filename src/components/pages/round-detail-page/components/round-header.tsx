import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareDialog } from '@/components/shared/share-dialog/share-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog/confirm-dialog';
import { EditRoundDialog } from './edit-round-dialog';
import { DeleteRoundDialog } from './delete-round-dialog';
import { statusLabels, nextTransitions } from './constants';
import type { RoundData } from '@/types';

interface RoundHeaderProps {
  round: RoundData;
  courses: Awaited<
    ReturnType<typeof import('@/lib/courses.server').getCoursesFn>
  >;
  isSingleRound: boolean;
  isCommissioner: boolean;
  inviteCode?: string;
  onTransition: (
    newStatus: 'draft' | 'scheduled' | 'open' | 'finalized',
  ) => void;
  onSaved: () => void;
  isTransitioning?: boolean;
  hasAnyScores?: boolean;
  allScorecardsComplete?: boolean;
}

export function RoundHeader({
  round,
  courses,
  isSingleRound,
  isCommissioner,
  inviteCode,
  onTransition,
  onSaved,
  isTransitioning = false,
  hasAnyScores = false,
  allScorecardsComplete = true,
}: RoundHeaderProps) {
  const isDraft = round.status === 'draft';
  const tournamentId = round.tournamentId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finishWarningOpen, setFinishWarningOpen] = useState(false);

  const transitions = nextTransitions[round.status] ?? [];
  const backTransitions = transitions.filter((t) => {
    if (t.direction !== 'back') return false;
    if (round.status === 'open' && t.status === 'scheduled' && hasAnyScores)
      return false;
    return true;
  });
  const forwardTransitions = transitions.filter(
    (t) => t.direction === 'forward',
  );

  const hasTransitions =
    isCommissioner &&
    (backTransitions.length > 0 || forwardTransitions.length > 0);

  const iconButtonClass =
    'h-9 w-9 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors';

  return (
    <>
      <div className="bg-primary text-primary-foreground -mx-4 -mt-4 mb-4">
        <div className="space-y-4 px-4 pt-5 pb-4">
          {/* Top row: back nav + utility icons */}
          <div className="flex items-center justify-between gap-2">
            {isSingleRound ? (
              <Link
                to="/"
                className="text-primary-foreground/80 hover:text-primary-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId }}
                className="text-primary-foreground/80 hover:text-primary-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
                {round.tournament?.name ?? 'Tournament'}
              </Link>
            )}

            <div className="flex items-center gap-0.5">
              {isCommissioner && isDraft && (
                <EditRoundDialog
                  round={round}
                  courses={courses}
                  onSaved={onSaved}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                    >
                      <Pencil className="h-5 w-5" />
                    </Button>
                  }
                />
              )}

              {isCommissioner && isSingleRound && inviteCode && (
                <ShareDialog
                  displayName={round.course.name}
                  inviteCode={inviteCode}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  }
                />
              )}

              {isCommissioner && isDraft && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete round
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Title + status */}
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Heading level={1} color="inherit">
                {isSingleRound
                  ? round.course.name
                  : `Round ${round.roundNumber ?? '—'}`}
              </Heading>
              <Badge
                variant="outline"
                className="border-primary-foreground/40 bg-primary-foreground/15 text-primary-foreground font-semibold"
              >
                {statusLabels[round.status]}
              </Badge>
            </div>

            {/* Metadata */}
            <div className="text-primary-foreground/80 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link
                to="/courses/$courseId"
                params={{ courseId: round.course.id }}
                className="hover:text-primary-foreground transition-colors"
              >
                {round.course.name}
              </Link>
              {round.date && (
                <span>
                  {new Date(round.date).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {(round as { teeTime?: string | null }).teeTime && (
                    <>
                      {' '}
                      &middot; {(round as { teeTime?: string | null }).teeTime}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA transition buttons */}
        {hasTransitions && (
          <div className="flex gap-2 px-4 pb-5">
            {backTransitions.map((t) => (
              <Button
                key={t.status}
                variant="ghost"
                className="border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground border"
                disabled={isTransitioning}
                onClick={() =>
                  onTransition(
                    t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
                  )
                }
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t.label}
              </Button>
            ))}
            {forwardTransitions.map((t) => {
              const targetStatus = t.status as
                | 'draft'
                | 'scheduled'
                | 'open'
                | 'finalized';
              const needsWarning =
                targetStatus === 'finalized' && !allScorecardsComplete;

              return (
                <Button
                  key={t.status}
                  variant="secondary"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 flex-1 font-semibold"
                  disabled={isTransitioning}
                  onClick={() => {
                    if (needsWarning) {
                      setFinishWarningOpen(true);
                    } else {
                      onTransition(targetStatus);
                    }
                  }}
                >
                  {t.label}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <DeleteRoundDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        roundId={round.id}
        tournamentId={round.tournamentId}
        roundNumber={round.roundNumber}
        isSingleRound={isSingleRound}
        isCommissioner={isCommissioner}
        roundStatus={round.status}
      />

      <ConfirmDialog
        open={finishWarningOpen}
        onOpenChange={setFinishWarningOpen}
        title="Incomplete Scorecards"
        description="Some players have not completed their scorecards. Are you sure you want to finish the round?"
        confirmText="Finish Round"
        onConfirm={async () => {
          setFinishWarningOpen(false);
          onTransition('finalized');
        }}
      />
    </>
  );
}
