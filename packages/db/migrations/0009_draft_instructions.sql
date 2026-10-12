ALTER TABLE `projects` ADD `reply_instructions` text;--> statement-breakpoint
ALTER TABLE `usage` ADD `drafts` integer DEFAULT 0 NOT NULL;