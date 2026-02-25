import { z } from 'zod';

export const handicapField = z
  .number()
  .min(-10, 'Handicap cannot be below -10')
  .max(54, 'Handicap cannot exceed 54')
  .multipleOf(0.1, 'Handicap must be to one decimal place')
  .nullable()
  .optional();

export const dateField = z.string().max(10);

export const teeTimeField = z.string().max(5);
