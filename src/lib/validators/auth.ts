import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = loginSchema
  .extend({
    confirmPassword: z.string().max(128),
    displayName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;
