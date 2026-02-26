import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  onTransition: (
    newStatus: 'draft' | 'scheduled' | 'open' | 'finalized',
  ) => void;
  onSaved: () => void;
}

export function RoundHeader({
  round,
  courses,
  isSingleRound,
  isCommissioner,
  onTransition,
  onSaved,
}: RoundHeaderProps) {
  const isDraft = round.status === 'draft';
  const tournamentId = round.tournamentId;

  const transitions = nextTransitions[round.status] ?? [];
  const backTransitions = transitions.filter((t) => t.direction === 'back');
  const forwardTransitions = transitions.filter(
    (t) => t.direction === 'forward',
  );

  return (
    <div className="flex items-center justify-between">
      <div>
        {!isSingleRound && (
          <div className="text-muted-foreground mb-1 text-sm">
            <Link
              to="/tournaments/$tournamentId"
              params={{ tournamentId }}
              className="hover:text-primary underline"
            >
              ← {round.tournament?.name ?? 'Tournament'}
            </Link>
          </div>
        )}
        {isSingleRound && (
          <div className="text-muted-foreground mb-1 text-sm">
            <Link to="/" className="hover:text-primary underline">
              ← Dashboard
            </Link>
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight">
          {isSingleRound
            ? round.course.name
            : `Round ${round.roundNumber ?? '—'}`}
        </h1>
        <div className="text-muted-foreground mt-1 flex items-center gap-3">
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
                <> · {(round as { teeTime?: string | null }).teeTime}</>
              )}
            </span>
          )}
          <Badge variant={statusColors[round.status]}>
            {statusLabels[round.status]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Back transitions — left side */}
        {isCommissioner &&
          backTransitions.map((t) => (
            <Button
              key={t.status}
              size="sm"
              variant="outline"
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

        {/* Forward transitions — right side */}
        {isCommissioner &&
          forwardTransitions.map((t) => (
            <Button
              key={t.status}
              size="sm"
              variant="default"
              onClick={() =>
                onTransition(
                  t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
                )
              }
            >
              {t.label}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ))}
      </div>
    </div>
  );
}
