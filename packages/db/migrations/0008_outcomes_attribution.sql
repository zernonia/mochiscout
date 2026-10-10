CREATE TABLE `ref_stats` (
	`code` text NOT NULL,
	`day` text NOT NULL,
	`project_id` text NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`signups` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`code`, `day`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ref_stats_project_idx` ON `ref_stats` (`project_id`,`day`);--> statement-breakpoint
ALTER TABLE `subreddits` ADD `description` text;--> statement-breakpoint
ALTER TABLE `subreddits` ADD `auto_rules_json` text;--> statement-breakpoint
ALTER TABLE `subreddits` ADD `auto_rules_at` integer;--> statement-breakpoint
ALTER TABLE `subreddits` ADD `stats_json` text;--> statement-breakpoint
ALTER TABLE `subreddits` ADD `stats_at` integer;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_url` text;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_status` text;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_checked_at` integer;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `ref_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `thread_scores_ref_code_idx` ON `thread_scores` (`ref_code`);