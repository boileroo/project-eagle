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

const courseBaseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  location: z.string().optional(),
  numberOfHoles: z.union([z.literal(9), z.literal(18)]),
  holes: z.array(courseHoleSchema),
});

const uniqueStrokeIndex = (data: { holes: { strokeIndex: number }[] }) => {
  const siValues = data.holes.map((h) => h.strokeIndex);
  return new Set(siValues).size === siValues.length;
};
const uniqueSiMessage = {
  message: 'Each stroke index must be unique',
  path: ['holes'] as PropertyKey[],
};

export const createCourseSchema = courseBaseSchema.refine(
  uniqueStrokeIndex,
  uniqueSiMessage,
);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = courseBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(uniqueStrokeIndex, uniqueSiMessage);
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
