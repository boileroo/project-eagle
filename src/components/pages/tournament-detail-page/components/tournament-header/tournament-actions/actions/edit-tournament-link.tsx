import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

type EditTournamentLinkProps = {
  tournamentId: string;
};

export function EditTournamentLink({ tournamentId }: EditTournamentLinkProps) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/tournaments/$tournamentId/edit" params={{ tournamentId }}>
        Edit
      </Link>
    </Button>
  );
}
