import { useState } from 'react';
import type {
  WizardRound,
  WizardPlayer,
  WizardCompetition,
} from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-3">
      {onRemove && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Round {roundNumber}</h3>
          <Button type="button" variant="outline" size="sm" onClick={onRemove}>
            Remove Round
          </Button>
        </div>
      )}

      {/* Card 1: Round Details */}
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Round Details</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={`round-${roundNumber}-course`} className="text-xs">
              Course <span className="text-destructive">*</span>
            </Label>
            <select
              id={`round-${roundNumber}-course`}
              value={round.courseId}
              onChange={(e) => onChange({ ...round, courseId: e.target.value })}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`round-${roundNumber}-date`} className="text-xs">
              Date
            </Label>
            <Input
              id={`round-${roundNumber}-date`}
              type="date"
              value={round.date ? round.date.slice(0, 10) : ''}
              onChange={(e) => {
                onChange({ ...round, date: e.target.value || undefined });
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`round-${roundNumber}-tee`} className="text-xs">
              Tee Time
            </Label>
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

      {/* Card 2: Competitions */}
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Competitions</h4>
        <WizardCompetitionList
          competitions={round.competitions}
          onRemove={handleRemoveComp}
        />
        {activeForm === 'game' && (
          <WizardCompetitionForm
            mode="game"
            hasTeams={hasTeams}
            players={players}
            onAdd={handleAddComp}
            onCancel={() => setActiveForm(null)}
          />
        )}
        {activeForm === 'bonus' && (
          <WizardCompetitionForm
            mode="bonus"
            hasTeams={hasTeams}
            players={players}
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
