import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { createSingleRoundFn } from '@/lib/rounds.server';
import type { CreateSingleRoundInput } from '@/lib/validators';
import type { CourseListSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { NewRoundForm } from './components/new-round-form';

export function NewRoundPage({ courses }: { courses: CourseListSummary[] }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: CreateSingleRoundInput) => {
    setSubmitting(true);
    try {
      const result = await createSingleRoundFn({ data });
      toast.success('Round created!');
      navigate({
        to: '/tournaments/$tournamentId/rounds/$roundId',
        params: {
          tournamentId: result.tournamentId,
          roundId: result.roundId,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create round',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Round</h1>
        <p className="text-muted-foreground">
          Start a single round. Pick a course and head straight to the
          scorecard.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              You need at least one course before creating a round.
            </p>
            <Button asChild>
              <a href="/courses/new">Add Course</a>
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
