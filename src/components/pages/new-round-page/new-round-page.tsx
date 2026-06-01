import { useNavigate, Link } from '@tanstack/react-router';
import { useCreateSingleRound } from '@/lib/rounds';
import type { CreateSingleRoundInput } from '@/lib/validators';
import type { CourseListSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { toast } from 'sonner';
import { NewRoundForm } from './components/new-round-form';

export function NewRoundPage({ courses }: { courses: CourseListSummary[] }) {
  const navigate = useNavigate();
  const [createSingleRound, { isPending: submitting }] = useCreateSingleRound();

  const handleSubmit = async (data: CreateSingleRoundInput) => {
    await createSingleRound({
      variables: data,
      onSuccess: (result) => {
        toast.success('Round created!');
        navigate({
          to: '/tournaments/$tournamentId/rounds/$roundId',
          params: {
            tournamentId: result.tournamentId,
            roundId: result.roundId,
          },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Heading level={1}>New Round</Heading>
        <Text size="sm" color="muted">
          Start a single round. Pick a course and head straight to the
          scorecard.
        </Text>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              You need at least one course before creating a round.
            </p>
            <Button asChild>
              <Link to="/courses/new">Add Course</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <NewRoundForm
          courses={courses}
          onSubmit={handleSubmit}
          submitting={submitting}
          onCancel={() => navigate({ to: '/' })}
        />
      )}
    </div>
  );
}
