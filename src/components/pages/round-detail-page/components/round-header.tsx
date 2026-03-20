import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header/page-header';
import { ShareDialog } from '@/components/shared/share-dialog/share-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog/confirm-dialog';
import { EditRoundDialog } from './edit-round-dialog';
import { DeleteRoundDialog } from './delete-round-dialog';
import { statusColors, statusLabels, nextTransitions } from './constants';
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

  const breadcrumb = isSingleRound ? (
    <Link to="/" className="hover:text-primary underline">
      &larr; Dashboard
    </Link>
  ) : (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId }}
      className="hover:text-primary underline"
    >
      &larr; {round.tournament?.name ?? 'Tournament'}
    </Link>
  );

  const metadata = (
    <>
      <Link
        to="/courses/$courseId"
        params={{ courseId: round.course.id }}
        className="hover:text-primary hover:underline"
      >
        @ {round.course.name}
      </Link>
      {round.date && (
        <span>
          {new Date(round.date).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {(round as { teeTime?: string | null }).teeTime && (
            <> &middot; {(round as { teeTime?: string | null }).teeTime}</>
          )}
        </span>
      )}
      <Badge variant={statusColors[round.status]}>
        {statusLabels[round.status]}
      </Badge>
    </>
  );

  const actions = (
    <>
      {isCommissioner &&
        backTransitions.map((t) => (
          <Button
            key={t.status}
            size="sm"
            variant="outline"
            disabled={isTransitioning}
            onClick={() =>
              onTransition(
                t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
              )
            }
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            {t.label}
          </Button>
        ))}

      {isCommissioner && isDraft && (
        <EditRoundDialog round={round} courses={courses} onSaved={onSaved} />
      )}

      {isCommissioner && isSingleRound && inviteCode && (
        <ShareDialog displayName={round.course.name} inviteCode={inviteCode} />
      )}

      {isCommissioner && round.status === 'draft' && (
        <DeleteRoundDialog
          roundId={round.id}
          tournamentId={round.tournamentId}
          roundNumber={round.roundNumber}
          isSingleRound={isSingleRound}
          isCommissioner={isCommissioner}
          roundStatus={round.status}
        />
      )}

      {isCommissioner &&
        forwardTransitions.map((t) => {
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
              size="sm"
              variant="default"
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
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          );
        })}
    </>
  );

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={
          isSingleRound
            ? round.course.name
            : `Round ${round.roundNumber ?? '—'}`
        }
        metadata={metadata}
        actions={actions}
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
