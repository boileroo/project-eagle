-- Update existing invite codes to uppercase to fix case-sensitivity issues
UPDATE "tournaments" SET "invite_code" = UPPER("invite_code") WHERE "invite_code" != UPPER("invite_code");
