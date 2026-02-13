// Shared Zod validation schemas
//
// For database-derived schemas, see src/db/schema.ts (auto-generated via drizzle-zod).
// This file is for app-level validation schemas (forms, API inputs, etc.)

import { z } from 'zod'

// ──────────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signUpSchema = loginSchema
  .extend({
    confirmPassword: z.string(),
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type SignUpInput = z.infer<typeof signUpSchema>
