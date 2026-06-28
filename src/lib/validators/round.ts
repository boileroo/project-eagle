import { z } from 'zod';
import { dateField, teeTimeField } from './shared';

export const createRoundSchema = z.object({
  tournamentId: z.string().uuid(),
  courseId: z.string().uuid('Please select a course'),
  date: dateField.optional(),
  teeTime: teeTimeField.optional(),
  label: z.string().max(100).optional(),
});
export type CreateRoundInput = z.infer<typeof createRoundSchema>;

export const updateRoundSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid('Please select a course').optional(),
  date: dateField.optional(),
  teeTime: teeTimeField.optional(),
  label: z.string().max(100).optional(),
});
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;

export const createGroupSchema = z.object({
  roundId: z.string().uuid(),
  groupNumber: z.number().int().min(1),
  name: z.string().max(100).optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const assignPlayerToGroupSchema = z.object({
  roundPlayerId: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
});
export type AssignPlayerToGroupInput = z.infer<
  typeof assignPlayerToGroupSchema
>;

export const autoAssignGroupsSchema = z.object({
  roundId: z.string().uuid(),
  groupSize: z.number().int().min(1).max(4).default(4),
});
export type AutoAssignGroupsInput = z.infer<typeof autoAssignGroupsSchema>;
