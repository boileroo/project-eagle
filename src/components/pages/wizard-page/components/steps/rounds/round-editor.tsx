import { useState } from 'react';
import type {
  WizardRound,
  WizardPlayer,
  WizardCompetition,
  WizardTeam,
} from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heading } from '@/components/ui/heading';
import { SelectInput } from '@/components/ui/select-input';
import { WizardCompetitionForm } from './components/wizard-competition-form';
import { WizardCompetitionList } from './components/wizard-competition-list';

interface CourseOption {
  id: string;
  name: string;
}

interface RoundEditorProps {
  round: WizardRound;
  roundNumber: number;
  players: WizardPlayer[];
  teams: WizardTeam[];
  courses: CourseOption[];
  hasTeams: boolean;
  onChange: (round: WizardRound) => void;
  onRemove?: () => void;
}

type ActiveForm = 'game' | 'bonus' | null;

export function RoundEditor({
  round,
  roundNumber,
  players,
  teams,
  courses,
  hasTeams,
  onChange,
  onRemove,
}: RoundEditorProps) {
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const handleAddComp = (comps: WizardCompetition[]) => {
    onChange({ ...round, competitions: [...round.competitions, ...comps] });
    setActiveForm(null);
  };

  const handleRemoveComp = (index: number) => {
    onChange({
      ...round,
      competitions: round.competitions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {onRemove && (
        <div className="flex items-center justify-between">
          <Heading level={3}>Round {roundNumber}</Heading>
        </div>
      )}

      {/* Round Details */}
      <div className="space-y-4 rounded-xl border p-4">
        <Heading level={4}>Round Details</Heading>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`round-${roundNumber}-course`}>
              Course <span className="text-destructive">*</span>
            </Label>
            <SelectInput
              id={`round-${roundNumber}-course`}
              value={round.courseId}
              onChange={(e) => onChange({ ...round, courseId: e.target.value })}
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`round-${roundNumber}-date`}>Date</Label>
              <Input
                id={`round-${roundNumber}-date`}
                type="date"
                value={round.date ? round.date.slice(0, 10) : ''}
                onChange={(e) =>
                  onChange({ ...round, date: e.target.value || undefined })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`round-${roundNumber}-tee`}>Tee Time</Label>
              <Input
                id={`round-${roundNumber}-tee`}
                type="time"
                value={round.teeTime ?? ''}
                onChange={(e) =>
                  onChange({ ...round, teeTime: e.target.value || undefined })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Competitions */}
      <div className="space-y-3 rounded-xl border p-4">
        <Heading level={4}>Competitions</Heading>
        <WizardCompetitionList
          competitions={round.competitions}
          onRemove={handleRemoveComp}
        />
        {activeForm === 'game' && (
          <WizardCompetitionForm
            mode="game"
            hasTeams={hasTeams}
            players={players}
            teams={teams}
            onAdd={handleAddComp}
            onCancel={() => setActiveForm(null)}
          />
        )}
        {activeForm === 'bonus' && (
          <WizardCompetitionForm
            mode="bonus"
            hasTeams={hasTeams}
            players={players}
            teams={teams}
            onAdd={handleAddComp}
            onCancel={() => setActiveForm(null)}
          />
        )}
        {activeForm === null && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveForm('game')}
            >
              {hasTeams ? 'Add Match' : 'Add Game'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveForm('bonus')}
            >
              Add Bonus
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
