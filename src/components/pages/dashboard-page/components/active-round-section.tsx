import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import type { ActiveRound } from '@/types';

import { LiveBadge } from '@/components/ui/live-badge';

interface ActiveRoundSectionProps {
  activeRounds: ActiveRound[];
}

export function ActiveRoundSection({ activeRounds }: ActiveRoundSectionProps) {
  if (activeRounds.length === 0) return null;

  const round = activeRounds[0];
  const roundTitle = round.isSingleRound
    ? round.tournamentName
    : `Round ${round.roundNumber ?? 1}`;

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      {/* Main Active Round Card */}
      <Card
        isHoverable
        className="relative flex w-full flex-col justify-between gap-6 overflow-hidden rounded-[2.5rem] border-white/5 p-6 sm:p-8 md:flex-row md:items-center"
      >
        <div className="flex flex-col gap-4 md:gap-2">
          {/* Top row: LIVE pill and Course Name */}
          <div className="flex items-center gap-3">
            <LiveBadge />
            <Text size="sm" color="muted">
              {round.courseName}
            </Text>
          </div>

          {/* Title */}
          <div>
            <Heading level={2} color="white">
              {roundTitle}
            </Heading>
            {!round.isSingleRound && (
              <Text size="sm" color="muted" className="mt-1">
                {round.tournamentName}
              </Text>
            )}
          </div>
        </div>

        <Link
          to="/tournaments/$tournamentId/rounds/$roundId"
          params={{
            tournamentId: round.tournamentId,
            roundId: round.roundId,
          }}
          className="bg-tokyo-blue text-background flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 font-bold tracking-wider uppercase md:w-auto md:shrink-0"
        >
          <Text size="sm" asChild>
            <span>Continue Round</span>
          </Text>
          <span className="ml-1 leading-none">→</span>
        </Link>
      </Card>

      {/* If there are more active rounds, list them minimally underneath */}
      {activeRounds.length > 1 && (
        <div className="flex flex-col gap-2">
          {activeRounds.slice(1).map((r) => (
            <Link
              key={r.roundId}
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: r.tournamentId,
                roundId: r.roundId,
              }}
              className="group block focus-visible:outline-none"
            >
              <Card
                isHoverable
                className="flex flex-row items-center justify-between gap-4 rounded-[2rem] border-white/5 px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Text
                      size="xs"
                      color="green"
                      className="flex items-center gap-1 font-bold tracking-wider uppercase"
                    >
                      <div className="bg-tokyo-green h-1.5 w-1.5 animate-pulse rounded-full" />
                      LIVE
                    </Text>
                    <Text size="xs" color="muted">
                      {r.courseName}
                    </Text>
                  </div>
                  <Text color="white" className="mt-1 font-bold">
                    {r.isSingleRound
                      ? r.tournamentName
                      : `Round ${r.roundNumber ?? 1}`}
                  </Text>
                </div>
                <span className="text-tokyo-blue">→</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
