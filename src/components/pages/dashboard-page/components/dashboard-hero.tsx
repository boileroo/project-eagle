import { Heading } from '@/components/ui/heading';

export function DashboardHero({
  displayName,
  userEmail,
}: {
  displayName: string | null;
  userEmail: string;
}) {
  const name =
    displayName?.split(' ')[0] ?? userEmail.split('@')[0] ?? 'Player';

  return (
    <div className="text-center">
      <Heading level={1} color="red">
        Welcome back, {name}
        <span className="text-tokyo-white">.</span>
      </Heading>
    </div>
  );
}
