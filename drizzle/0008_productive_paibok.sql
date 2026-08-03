ALTER TABLE "session" ALTER COLUMN "token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "identifier" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ip_address_ciphertext" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "token_ciphertext" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "token_lookup" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_agent_ciphertext" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "title_ciphertext" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "title_lookup" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_ciphertext" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_lookup" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "image_ciphertext" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "name_ciphertext" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "name_lookup" text;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "identifier_ciphertext" text;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "identifier_lookup" text;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "subject_user_id" text;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "value_ciphertext" text;--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_lookup_unique_idx" ON "session" USING btree ("token_lookup") WHERE "session"."token_lookup" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_user_id_title_lookup_unique_idx" ON "tasks" USING btree ("user_id","title_lookup") WHERE "tasks"."title_lookup" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lookup_unique_idx" ON "user" USING btree ("email_lookup") WHERE "user"."email_lookup" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_name_lookup_unique_idx" ON "user" USING btree ("name_lookup") WHERE "user"."name_lookup" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "verification_identifier_lookup_idx" ON "verification" USING btree ("identifier_lookup") WHERE "verification"."identifier_lookup" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "verification_purpose_subject_user_id_idx" ON "verification" USING btree ("purpose","subject_user_id") WHERE "verification"."subject_user_id" IS NOT NULL;