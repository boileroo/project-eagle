import { z } from 'zod';
import { dateField, teeTimeField } from './shared';

export const createRoundSchema = z.object({
  tournamentId: z.string().uuid(),
  courseId: z.string().uuid('Please select a course'),
  date: dateField.optional(),
  teeTime: teeTimeField.optional(),
  format: z.string().max(100).optional(),
});
export type CreateRoundInput = z.infer<typeof createRoundSchema>;

export const updateRoundSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid('Please select a course').optional(),
  date: dateField.optional(),
  teeTime: teeTimeField.optional(),
  format: z.string().max(100).optional(),
});
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;

export const createRoundGroupSchema = z.object({
  roundId: z.string().uuid(),
  groupNumber: z.number().int().min(1),
  name: z.string().max(100).optional(),
});
export type CreateRoundGroupInput = z.infer<typeof createRoundGroupSchema>;

export const assignParticipantToGroupSchema = z.object({
  roundParticipantId: z.string().uuid(),
  roundGroupId: z.string().uuid().nullable(),
});
export type AssignParticipantToGroupInput = z.infer<
  typeof assignParticipantToGroupSchema
>;

export const autoAssignGroupsSchema = z.object({
  roundId: z.string().uuid(),
  groupSize: z.number().int().min(1).max(4).default(4),
});
export type AutoAssignGroupsInput = z.infer<typeof autoAssignGroupsSchema>;
