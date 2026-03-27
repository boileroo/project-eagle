import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');

const sql = postgres(DATABASE_URL, { prepare: false });

// 1. Drop the stale default (it still references tournament_role even though
//    the column is text, which is what's blocking everything)
await sql`ALTER TABLE tournament_participants ALTER COLUMN role DROP DEFAULT`;
console.log('✓ Dropped stale default on role');

// 2. Drop the tournament_role type entirely (nothing depends on it now)
await sql`DROP TYPE IF EXISTS tournament_role CASCADE`;
console.log('✓ Dropped tournament_role type');

// 3. Recreate it cleanly
await sql`CREATE TYPE tournament_role AS ENUM('commissioner', 'player')`;
console.log('✓ Recreated tournament_role enum');

// 4. Convert the column from text → enum
await sql`
  ALTER TABLE tournament_participants
  ALTER COLUMN role TYPE tournament_role USING role::tournament_role
`;
console.log('✓ Converted role column to tournament_role enum');

// 5. Restore the default
await sql`
  ALTER TABLE tournament_participants
  ALTER COLUMN role SET DEFAULT 'player'
`;
console.log('✓ Restored default on role');

// 6. Ensure round_group_id exists on game_decisions
try {
  await sql`
    ALTER TABLE game_decisions
    ADD COLUMN round_group_id UUID
    REFERENCES round_groups(id) ON DELETE CASCADE
  `;
  console.log('✓ Added round_group_id to game_decisions');
} catch (e: any) {
  if (e?.code === '42701') {
    console.log('~ round_group_id already exists');
  } else {
    throw e;
  }
}

await sql.end();
console.log('\nDone. Run: npm run db:push -- --force');
