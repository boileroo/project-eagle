export type Guest = {
  id: string;
  name: string;
  handicap: number | null;
  email: string | null;
  phone: string | null;
};

export type PersonSearchResult = Guest & {
  type: 'guest';
};
