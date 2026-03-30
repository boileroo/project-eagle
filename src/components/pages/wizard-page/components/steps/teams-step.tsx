import { useState } from 'react';
import type { WizardPlayer, WizardTeam } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TeamsStepProps {
  players: WizardPlayer[];
  teams: WizardTeam[];
  onChange: (teams: WizardTeam[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function buildDefaultTeams(): WizardTeam[] {
  return [
    { name: 'Team 1', playerIndices: [] },
    { name: 'Team 2', playerIndices: [] },
  ];
}

export function TeamsStep({
  players,
  teams,
  onChange,
  onNext,
  onBack,
}: TeamsStepProps) {
  const [enabled, setEnabled] = useState(teams.length > 0);
  const [localTeams, setLocalTeams] = useState<WizardTeam[]>(
    teams.length > 0 ? teams : buildDefaultTeams(),
  );

  const handleTeamNameChange = (teamIndex: number, name: string) => {
    const next = localTeams.map((t, i) =>
      i === teamIndex ? { ...t, name } : t,
    );
    setLocalTeams(next);
  };

  const handlePlayerAssign = (
    playerIndex: number,
    teamIndex: number | null,
  ) => {
    const next = localTeams.map((team, i) => {
      const filtered = team.playerIndices.filter((pi) => pi !== playerIndex);
      if (i === teamIndex) {
        return { ...team, playerIndices: [...filtered, playerIndex] };
      }
      return { ...team, playerIndices: filtered };
    });
    setLocalTeams(next);
  };

  const getPlayerTeam = (playerIndex: number): number | null => {
    const idx = localTeams.findIndex((t) =>
      t.playerIndices.includes(playerIndex),
    );
    return idx === -1 ? null : idx;
  };

  const addTeam = () => {
    setLocalTeams([
      ...localTeams,
      { name: `Team ${localTeams.length + 1}`, playerIndices: [] },
    ]);
  };

  const removeTeam = (teamIndex: number) => {
    const removed = localTeams[teamIndex];
    const next = localTeams
      .filter((_, i) => i !== teamIndex)
      .map((t) => ({
        ...t,
        playerIndices: t.playerIndices.filter(
          (pi) => !removed.playerIndices.includes(pi),
        ),
      }));
    setLocalTeams(next);
  };

  const handleNext = () => {
    if (enabled) {
      onChange(localTeams.filter((t) => t.name.trim().length > 0));
    } else {
      onChange([]);
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Teams</h2>
        <p className="text-muted-foreground text-sm">
          Optionally organise players into teams for team competitions. You can
          assign players to teams later from the tournament page.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            enabled ? 'bg-primary' : 'bg-input',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
        <span className="text-sm font-medium">Enable teams</span>
      </div>

      {enabled && (
        <div className="space-y-4">
          {localTeams.map((team, teamIndex) => (
            <div key={teamIndex} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`team-name-${teamIndex}`} className="text-xs">
                    Team Name
                  </Label>
                  <Input
                    id={`team-name-${teamIndex}`}
                    value={team.name}
                    onChange={(e) =>
                      handleTeamNameChange(teamIndex, e.target.value)
                    }
                    placeholder={`Team ${teamIndex + 1}`}
                  />
                </div>
                {localTeams.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTeam(teamIndex)}
                    className="mt-5"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map((player, playerIndex) => {
                  const assignedTeam = getPlayerTeam(playerIndex);
                  const isAssigned = assignedTeam === teamIndex;
                  return (
                    <button
                      key={playerIndex}
                      type="button"
                      onClick={() =>
                        handlePlayerAssign(
                          playerIndex,
                          isAssigned ? null : teamIndex,
                        )
                      }
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        isAssigned
                          ? 'border-primary bg-primary/10 text-primary'
                          : assignedTeam !== null
                            ? 'border-border text-muted-foreground opacity-50'
                            : 'border-border hover:bg-muted',
                      ].join(' ')}
                    >
                      {player.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addTeam}>
            Add Team
          </Button>
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
}
