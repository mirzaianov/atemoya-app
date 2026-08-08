CREATE TABLE "tags" (
	"color" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name_ciphertext" text NOT NULL,
	"name_lookup" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"tag_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "task_tags_user_id_task_id_tag_id_pk" PRIMARY KEY("user_id","task_id","tag_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_id_unique_idx" ON "tags" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_name_lookup_unique_idx" ON "tags" USING btree ("user_id","name_lookup");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_user_id_id_unique_idx" ON "tasks" USING btree ("user_id","id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_tag_fk" FOREIGN KEY ("user_id","tag_id") REFERENCES "public"."tags"("user_id","id") ON DELETE cascade ON UPDATE no action;
