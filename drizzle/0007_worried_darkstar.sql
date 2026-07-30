ALTER TABLE "tasks"
ALTER COLUMN "changed_on" SET DATA TYPE timestamp
USING (to_timestamp("changed_on" / 1000.0) AT TIME ZONE 'UTC');
