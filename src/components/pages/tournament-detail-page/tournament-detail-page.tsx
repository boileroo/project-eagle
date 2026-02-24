import { useRouter } from '@tanstack/react-router';
import { Separator } from '@/components/ui/separator';
import { ParticipantsSection } from './components/participants/participants-section';
import { RoundsSection } from './components/rounds/rounds-section';
import { LeaderboardSection } from './components/leaderboard/leaderboard-section';
import { TournamentHeader } from './components/tournament-header/tournament-header';
import type { TournamentLoaderData, Course, MyPerson } from '@/types';

export function TournamentDetailPage({
  userId,
  myPerson,
  tournament,
  courses,
}: {
  userId: string;
  myPerson: MyPerson;
  tournament: TournamentLoaderData;
  courses: Course[];
}) {
  const router = useRouter();

  const isCreator = userId === tournament.createdByUserId;
  const isCommissioner =
    isCreator ||
    (myPerson
      ? tournament.participants.some(
          (p) => p.personId === myPerson.id && p.role === 'commissioner',
        )
      : false);

  const isSetup = tournament.status === 'setup';

  return (
    <div className="space-y-4">
      <TournamentHeader
        tournament={tournament}
        isCommissioner={isCommissioner}
      />

      <Separator />

      <ParticipantsSection
        tournament={tournament}
        isCommissioner={isCommissioner}
        userId={userId}
        myPerson={myPerson}
        onChanged={() => router.invalidate()}
        defaultOpen={isSetup}
        competitions={[]}
      />

      <RoundsSection
        tournament={tournament}
        isCommissioner={isCommissioner}
        onChanged={() => router.invalidate()}
        courses={courses}
      />

      <LeaderboardSection tournamentId={tournament.id} />
    </div>
  );
}
