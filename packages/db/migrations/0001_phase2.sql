ALTER TABLE `drafts` ADD `promo` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `tracked_posts` ADD `thread_id` text;--> statement-breakpoint
ALTER TABLE `tracked_posts` ADD `title` text;--> statement-breakpoint
ALTER TABLE `tracked_posts` ADD `draft_id` text;--> statement-breakpoint
ALTER TABLE `tracked_posts` ADD `promo` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `tracked_posts_project_idx` ON `tracked_posts` (`project_id`,`posted_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `reddit_karma` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `reddit_account_created_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `reddit_account_status` text;--> statement-breakpoint
ALTER TABLE `users` ADD `reddit_checked_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `last_digest_at` integer;