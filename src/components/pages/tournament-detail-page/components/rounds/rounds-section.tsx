import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoundList } from './round-list';
import { AddRoundDialog } from '@/components/tournament-detail/add-round-dialog';
import type { RoundItem, Course } from '@/types';

type RoundsSectionProps = {
  tournament: {
    id: string;
    status: string;
    rounds: RoundItem[];
  };
  isCommissioner: boolean;
  onChanged: () => void;
  courses: Course[];
};

export function RoundsSection({
  tournament,
  isCommissioner,
  onChanged,
  courses,
}: RoundsSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(true);
  const isSetup = tournament.status === 'setup';

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between">
              <span>Rounds</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {tournament.rounds.length === 0
                    ? 'No rounds'
                    : `${tournament.rounds.length} round${tournament.rounds.length !== 1 ? 's' : ''}`}
                </Badge>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                    sectionOpen && 'rotate-180',
                  )}
                />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <RoundList
              tournamentId={tournament.id}
              rounds={tournament.rounds}
              isCommissioner={isCommissioner}
              onChanged={onChanged}
            />
            {isCommissioner && isSetup && (
              <AddRoundDialog
                tournamentId={tournament.id}
                courses={courses}
                onAdded={onChanged}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
