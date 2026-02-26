import type { courses, courseHoles } from '@/db/schema';

export type CourseData = typeof courses.$inferSelect & {
  holes: (typeof courseHoles.$inferSelect)[];
};

export type CourseListItem = {
  id: string;
  name: string;
  numberOfHoles: number;
  totalPar: number;
};

export type CourseListSummary = typeof courses.$inferSelect;
