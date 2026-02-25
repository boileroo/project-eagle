export type AccountData = {
  profile: {
    email: string;
    displayName: string | null;
  };
  person: {
    currentHandicap: string | null;
  } | null;
};
