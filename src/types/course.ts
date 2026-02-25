export type HoleData = {
  number: number;
  par: number;
  strokeIndex: number;
};

export type CourseData = {
  id: string;
  name: string;
  location: string | null;
  holes: HoleData[];
  totalPar: number;
  numberOfHoles: number;
};

export type CourseListItem = {
  id: string;
  name: string;
  numberOfHoles: number;
  totalPar: number;
};
