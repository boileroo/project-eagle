import { createFileRoute } from '@tanstack/react-router';
import { getCoursesFn } from '@/lib/courses.server';
import { getMyPersonFn } from '@/lib/tournaments.server';
import { WizardPage } from '@/components/pages';

export const Route = createFileRoute('/_app/new')({
  loader: async () => {
    const [courses, person] = await Promise.all([
      getCoursesFn(),
      getMyPersonFn(),
    ]);
    return { courses, person };
  },
  component: function NewRoute() {
    const { courses, person } = Route.useLoaderData();
    return (
      <WizardPage
        courses={courses}
        creatorName={person?.displayName ?? null}
      />
    );
  },
});
