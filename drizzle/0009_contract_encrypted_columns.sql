ALTER TABLE "session" DROP CONSTRAINT "session_token_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_name_unique";--> statement-breakpoint
DROP INDEX "tasks_user_id_title_unique_idx";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "session_token_lookup_unique_idx";--> statement-breakpoint
DROP INDEX "tasks_user_id_title_lookup_unique_idx";--> statement-breakpoint
DROP INDEX "user_email_lookup_unique_idx";--> statement-breakpoint
DROP INDEX "user_name_lookup_unique_idx";--> statement-breakpoint
DROP INDEX "verification_identifier_lookup_idx";--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "token_ciphertext" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "token_lookup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "title_ciphertext" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "title_lookup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_ciphertext" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_lookup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "name_ciphertext" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "name_lookup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "identifier_ciphertext" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "identifier_lookup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "purpose" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "value_ciphertext" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_lookup_unique_idx" ON "session" USING btree ("token_lookup");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_user_id_title_lookup_unique_idx" ON "tasks" USING btree ("user_id","title_lookup");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lookup_unique_idx" ON "user" USING btree ("email_lookup");--> statement-breakpoint
CREATE UNIQUE INDEX "user_name_lookup_unique_idx" ON "user" USING btree ("name_lookup");--> statement-breakpoint
CREATE INDEX "verification_identifier_lookup_idx" ON "verification" USING btree ("identifier_lookup");--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "user_agent";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "identifier";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "value";