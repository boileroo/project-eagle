import { z } from 'zod';

export const courseHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18),
  yardage: z.number().int().min(50).max(700).nullable().optional(),
});
export type CourseHoleInput = z.infer<typeof courseHoleSchema>;

const courseBaseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(150),
  location: z.string().max(200).optional(),
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
