export interface PlayerSetup {
  slot: 'test_a' | 'test_b' | 'guest';
  guestName?: string;
  handicap: number;
}

export interface GroupSetup {
  /** Indices into the scenario's players array */
  playerIndices: number[];
}

export interface TeamSetup {
  name: string;
  /** Indices into the scenario's players array */
  memberIndices: number[];
}

export interface CompetitionSetup {
  name: string;
  competitionCategory: 'match' | 'game' | 'bonus';
  groupScope: 'all' | 'within_group';
  formatType: string;
  /** Raw config object matching the format's Zod schema config field */
  config: Record<string, unknown>;
  /**
   * If set, this competition is scoped to the group at this index (0-based)
   * rather than all groups. The index is resolved to a roundGroupId at setup time.
   */
  groupIndex?: number;
  /**
   * If true, pairings/team references in config will be resolved at setup
   * time using actual round participant or team IDs.
   * Used for match_play (player pairings) and best_ball/hi_lo (team pairings).
   */
  requiresPairingResolution?: boolean;
}

export interface RoundSetup {
  courseIndex: 0 | 1;
  groups: GroupSetup[];
  competitions: CompetitionSetup[];
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  players: PlayerSetup[];
  teams?: TeamSetup[];
  rounds: RoundSetup[];
}

export interface SetupScenarioResult {
  tournamentId: string;
  roundIds: string[];
  inviteCode: string;
}
