ALTER TABLE "competitions" ADD COLUMN "round_group_id" uuid REFERENCES "round_groups"("id") ON DELETE SET NULL;
