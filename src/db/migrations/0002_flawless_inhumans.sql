-- Add invite_code column with temporary default
ALTER TABLE "tournaments" ADD COLUMN "invite_code" text NOT NULL DEFAULT 'TEMP';

-- Update existing tournaments with generated codes
UPDATE "tournaments" SET "invite_code" = 'SETUP-' || substr(md5(random()::text), 1, 4) WHERE "invite_code" = 'TEMP';

-- Now drop the default and add unique constraint
ALTER TABLE "tournaments" ALTER COLUMN "invite_code" DROP DEFAULT;
CREATE UNIQUE INDEX "tournaments_invite_code_unique" ON "tournaments" USING btree ("invite_code");
