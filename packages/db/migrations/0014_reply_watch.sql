CREATE TABLE `reply_responses` (
	`project_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`id` text NOT NULL,
	`author` text,
	`body` text NOT NULL,
	`url` text NOT NULL,
	`posted_at` integer,
	`found_at` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notified_at` integer,
	`follow_up` text,
	PRIMARY KEY(`project_id`, `id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reply_responses_project_status_idx` ON `reply_responses` (`project_id`,`status`,`found_at`);--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_text` text;