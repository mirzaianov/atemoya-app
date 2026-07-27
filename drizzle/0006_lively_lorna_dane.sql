ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_user_id_title_unique_idx" ON "tasks" USING btree ("user_id",lower("title"));