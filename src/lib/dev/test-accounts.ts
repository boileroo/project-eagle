export const TEST_ACCOUNTS = {
  A: { email: 'test-a@aerie.dev', displayName: 'Test User A' },
  B: { email: 'test-b@aerie.dev', displayName: 'Test User B' },
} as const;

export type TestAccountKey = keyof typeof TEST_ACCOUNTS;
