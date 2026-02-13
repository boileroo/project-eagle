// Shared Zod validation schemas
//
// For database-derived schemas, see src/db/schema.ts (auto-generated via drizzle-zod).
// This file is for app-level validation schemas (forms, API inputs, etc.)

import { z } from 'zod';

// ──────────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = loginSchema
  .extend({
    confirmPassword: z.string(),
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

// ──────────────────────────────────────────────
// Course schemas
// ──────────────────────────────────────────────

export const courseHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18),
  yardage: z.number().int().min(50).max(700).nullable().optional(),
});
export type CourseHoleInput = z.infer<typeof courseHoleSchema>;

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  location: z.string().optional(),
  numberOfHoles: z.union([z.literal(9), z.literal(18)]),
  holes: z.array(courseHoleSchema),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.extend({
  id: z.string().uuid(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
