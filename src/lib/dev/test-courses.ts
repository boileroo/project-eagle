export interface TestCourseHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number;
}

export interface TestCourse {
  name: string;
  location: string;
  holes: TestCourseHole[];
}

/**
 * Two realistic 18-hole test courses with varied pars and stroke indices.
 *
 * - Hawk's Ridge GC: Par 72 (36 + 36), links-style.
 * - Falcon Creek CC: Par 71 (35 + 36), parkland-style.
 *
 * Created on-demand by setupScenarioFn if they don't already exist in the DB.
 */
export const TEST_COURSES: [TestCourse, TestCourse] = [
  {
    name: "Hawk's Ridge GC",
    location: 'Test Course',
    holes: [
      { holeNumber: 1, par: 4, strokeIndex: 7, yardage: 385 },
      { holeNumber: 2, par: 3, strokeIndex: 13, yardage: 165 },
      { holeNumber: 3, par: 5, strokeIndex: 1, yardage: 525 },
      { holeNumber: 4, par: 4, strokeIndex: 9, yardage: 410 },
      { holeNumber: 5, par: 4, strokeIndex: 3, yardage: 430 },
      { holeNumber: 6, par: 4, strokeIndex: 15, yardage: 340 },
      { holeNumber: 7, par: 3, strokeIndex: 11, yardage: 180 },
      { holeNumber: 8, par: 5, strokeIndex: 5, yardage: 540 },
      { holeNumber: 9, par: 4, strokeIndex: 17, yardage: 365 },
      { holeNumber: 10, par: 4, strokeIndex: 4, yardage: 420 },
      { holeNumber: 11, par: 5, strokeIndex: 12, yardage: 510 },
      { holeNumber: 12, par: 3, strokeIndex: 18, yardage: 155 },
      { holeNumber: 13, par: 4, strokeIndex: 2, yardage: 445 },
      { holeNumber: 14, par: 4, strokeIndex: 8, yardage: 395 },
      { holeNumber: 15, par: 4, strokeIndex: 6, yardage: 405 },
      { holeNumber: 16, par: 5, strokeIndex: 10, yardage: 550 },
      { holeNumber: 17, par: 3, strokeIndex: 16, yardage: 170 },
      { holeNumber: 18, par: 4, strokeIndex: 14, yardage: 375 },
    ],
  },
  {
    name: 'Falcon Creek CC',
    location: 'Test Course',
    holes: [
      { holeNumber: 1, par: 4, strokeIndex: 5, yardage: 390 },
      { holeNumber: 2, par: 4, strokeIndex: 11, yardage: 360 },
      { holeNumber: 3, par: 3, strokeIndex: 17, yardage: 145 },
      { holeNumber: 4, par: 5, strokeIndex: 1, yardage: 535 },
      { holeNumber: 5, par: 4, strokeIndex: 7, yardage: 415 },
      { holeNumber: 6, par: 4, strokeIndex: 3, yardage: 440 },
      { holeNumber: 7, par: 3, strokeIndex: 15, yardage: 175 },
      { holeNumber: 8, par: 4, strokeIndex: 9, yardage: 380 },
      { holeNumber: 9, par: 4, strokeIndex: 13, yardage: 350 },
      { holeNumber: 10, par: 4, strokeIndex: 2, yardage: 450 },
      { holeNumber: 11, par: 3, strokeIndex: 14, yardage: 160 },
      { holeNumber: 12, par: 5, strokeIndex: 8, yardage: 520 },
      { holeNumber: 13, par: 4, strokeIndex: 4, yardage: 425 },
      { holeNumber: 14, par: 4, strokeIndex: 10, yardage: 370 },
      { holeNumber: 15, par: 5, strokeIndex: 6, yardage: 545 },
      { holeNumber: 16, par: 3, strokeIndex: 18, yardage: 140 },
      { holeNumber: 17, par: 4, strokeIndex: 12, yardage: 400 },
      { holeNumber: 18, par: 4, strokeIndex: 16, yardage: 355 },
    ],
  },
];
