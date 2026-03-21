import { useState, useCallback } from 'react';
import { useMatch, useRouter } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { TEST_ACCOUNTS } from '@/lib/dev/test-accounts';
import { PresetsTab } from './components/presets-tab';
import { ScoresTab } from './components/scores-tab';
import { ActionsTab } from './components/actions-tab';

type Tab = 'presets' | 'scores' | 'actions';

type RoundParticipant = {
  id: string;
  handicapSnapshot: string;
  person: { displayName: string; userId: string | null };
};

type CourseHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
};

export type RoundContext = {
  tournamentId: string;
  roundId: string;
  roundStatus: string;
  tournamentName: string;
  participants: RoundParticipant[];
  holes: CourseHole[];
};

function useRoundContext(): RoundContext | null {
  const match = useMatch({
    from: '/_app/tournaments/$tournamentId/rounds/$roundId/',
    shouldThrow: false,
  });

  if (!match?.loaderData) return null;

  const { round, tournament } = match.loaderData as {
    round: {
      id: string;
      status: string;
      tournamentId: string;
      course: {
        holes: Array<{
          holeNumber: number;
          par: number;
          strokeIndex: number;
        }>;
      };
      participants: Array<{
        id: string;
        handicapSnapshot: string;
        person: { displayName: string; userId: string | null };
      }>;
    };
    tournament: {
      name: string;
    };
  };

  return {
    tournamentId: round.tournamentId,
    roundId: round.id,
    roundStatus: round.status,
    tournamentName: tournament.name,
    participants: round.participants,
    holes: round.course.holes.sort((a, b) => a.holeNumber - b.holeNumber),
  };
}

function useCurrentTestUser(): 'A' | 'B' | null {
  const match = useMatch({
    from: '/_app',
    shouldThrow: false,
  });

  const user = (
    match?.context as { user?: { email?: string } | null } | undefined
  )?.user;

  if (!user?.email) return null;
  if (user.email === TEST_ACCOUNTS.A.email) return 'A';
  if (user.email === TEST_ACCOUNTS.B.email) return 'B';
  return null;
}

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'actions', label: 'Actions' },
  { id: 'scores', label: 'Scores' },
];

export function DevTools() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('presets');
  const roundCtx = useRoundContext();
  const testUser = useCurrentTestUser();
  const router = useRouter();

  const handleNavigateToRound = useCallback(
    (tournamentId: string, roundId: string) => {
      window.location.href = `/tournaments/${tournamentId}/rounds/${roundId}/`;
    },
    [],
  );

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-4 z-9999 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="Dev Tools"
      >
        {open ? '\u2716' : '\uD83D\uDEE0\uFE0F'}
      </button>

      {open && (
        <div className="fixed bottom-16 left-4 z-9999 w-[360px] rounded-lg border bg-white shadow-xl dark:bg-zinc-900">
          {/* Header */}
          <div className="border-b px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Dev Tools</span>
              <Badge variant="outline" className="text-[10px]">
                DEV
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
              {testUser ? (
                <Badge variant="secondary" className="text-[10px]">
                  Test User {testUser}
                </Badge>
              ) : (
                <span className="text-muted-foreground">
                  Not a test account
                </span>
              )}
              {roundCtx && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground max-w-[180px] truncate">
                    {roundCtx.tournamentName}
                  </span>
                  <Badge
                    variant={
                      roundCtx.roundStatus === 'open' ? 'default' : 'secondary'
                    }
                    className="text-[10px]"
                  >
                    {roundCtx.roundStatus}
                  </Badge>
                  <span className="text-muted-foreground">
                    {roundCtx.participants.length}p
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {TAB_CONFIG.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto p-3">
            {tab === 'presets' && (
              <PresetsTab
                roundCtx={roundCtx}
                onNavigate={handleNavigateToRound}
                router={router}
              />
            )}
            {tab === 'actions' && (
              <ActionsTab roundCtx={roundCtx} router={router} />
            )}
            {tab === 'scores' && (
              <ScoresTab roundCtx={roundCtx} router={router} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
