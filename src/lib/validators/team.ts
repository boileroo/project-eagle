import { z } from 'zod';

export const createTeamSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(1, 'Team name is required').max(100),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1, 'Team name is required').max(100),
});
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const addTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  participantId: z.string().uuid(),
});
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
