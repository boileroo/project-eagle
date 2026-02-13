import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { courses, courseHoles } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type { CreateCourseInput, UpdateCourseInput } from './validators';

// ──────────────────────────────────────────────
// Helper: get authenticated user or throw
// ──────────────────────────────────────────────

async function requireAuth() {
  const request = getRequest();
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ──────────────────────────────────────────────
// List all courses
// ──────────────────────────────────────────────

export const getCoursesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const allCourses = await db.query.courses.findMany({
      orderBy: (courses, { desc }) => [desc(courses.createdAt)],
    });
    return allCourses;
  },
);

// ──────────────────────────────────────────────
// Get a single course with its holes
// ──────────────────────────────────────────────

export const getCourseFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { courseId: string }) => data)
  .handler(async ({ data }) => {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        holes: {
          orderBy: (holes, { asc }) => [asc(holes.holeNumber)],
        },
      },
    });
    if (!course) throw new Error('Course not found');
    return course;
  });

// ──────────────────────────────────────────────
// Create a course with holes
// ──────────────────────────────────────────────

export const createCourseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateCourseInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const [course] = await db
      .insert(courses)
      .values({
        name: data.name,
        location: data.location || null,
        numberOfHoles: data.numberOfHoles,
        createdByUserId: user.id,
      })
      .returning();

    if (data.holes.length > 0) {
      await db.insert(courseHoles).values(
        data.holes.map((hole) => ({
          courseId: course.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          yardage: hole.yardage ?? null,
        })),
      );
    }

    return { courseId: course.id };
  });

// ──────────────────────────────────────────────
// Update a course and its holes
// ──────────────────────────────────────────────

export const updateCourseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateCourseInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Verify ownership
    const existing = await db.query.courses.findFirst({
      where: eq(courses.id, data.id),
    });
    if (!existing) throw new Error('Course not found');
    if (existing.createdByUserId !== user.id) {
      throw new Error('You can only edit courses you created');
    }

    // Update course
    await db
      .update(courses)
      .set({
        name: data.name,
        location: data.location || null,
        numberOfHoles: data.numberOfHoles,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, data.id));

    // Replace holes: delete all then re-insert
    await db.delete(courseHoles).where(eq(courseHoles.courseId, data.id));

    if (data.holes.length > 0) {
      await db.insert(courseHoles).values(
        data.holes.map((hole) => ({
          courseId: data.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          yardage: hole.yardage ?? null,
        })),
      );
    }

    return { courseId: data.id };
  });

// ──────────────────────────────────────────────
// Delete a course
// ──────────────────────────────────────────────

export const deleteCourseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { courseId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const existing = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
    });
    if (!existing) throw new Error('Course not found');
    if (existing.createdByUserId !== user.id) {
      throw new Error('You can only delete courses you created');
    }

    // courseHoles cascade on delete, but rounds.courseId is RESTRICT
    // so this will fail if the course is used in any round — which is correct
    await db.delete(courses).where(eq(courses.id, data.courseId));

    return { success: true };
  });
