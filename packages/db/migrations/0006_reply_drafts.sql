ALTER TABLE `projects` ADD `auto_reply` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_draft` text;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_drafted_at` integer;