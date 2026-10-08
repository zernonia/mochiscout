CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`hash` text NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_unique` ON `api_keys` (`hash`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`subreddit` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`angle` text NOT NULL,
	`check_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orgs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`plan` text DEFAULT 'selfhost' NOT NULL,
	`polar_customer_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `orgs_owner_id_idx` ON `orgs` (`owner_id`);--> statement-breakpoint
CREATE TABLE `pain_points` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`severity` integer NOT NULL,
	`evidence_json` text,
	`subreddits_json` text,
	`run_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_subreddits` (
	`project_id` text NOT NULL,
	`subreddit` text NOT NULL,
	`fit_score` integer,
	`watching` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`project_id`, `subreddit`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subreddit`) REFERENCES `subreddits`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_subreddits_watching_idx` ON `project_subreddits` (`subreddit`) WHERE "project_subreddits"."watching" = 1;--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`icp` text,
	`keywords_json` text DEFAULT '[]' NOT NULL,
	`competitors_json` text DEFAULT '[]' NOT NULL,
	`intent_threshold` integer DEFAULT 60 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subreddits` (
	`name` text PRIMARY KEY NOT NULL,
	`subscribers` integer,
	`rules_json` text,
	`rules_version` text,
	`last_rss_at` integer,
	`rss_etag` text,
	`refresh_interval_min` integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `thread_scores` (
	`project_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`intent` integer NOT NULL,
	`kind` text NOT NULL,
	`reason` text,
	`reply_angle` text,
	`status` text DEFAULT 'new' NOT NULL,
	`scored_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`project_id`, `thread_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `thread_scores_inbox_idx` ON `thread_scores` (`project_id`,`status`,`intent`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`channel` text,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`author` text,
	`created_utc` integer NOT NULL,
	`snippet` text,
	`engagement_json` text,
	`source` text NOT NULL,
	`search_rank_flag` integer DEFAULT false NOT NULL,
	`ingested_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `threads_channel_created_idx` ON `threads` (`channel`,`created_utc`);--> statement-breakpoint
CREATE TABLE `tracked_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`subreddit` text,
	`posted_at` integer,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_checked_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`org_id` text NOT NULL,
	`period` text NOT NULL,
	`searches` integer DEFAULT 0 NOT NULL,
	`llm_input_tokens` integer DEFAULT 0 NOT NULL,
	`llm_output_tokens` integer DEFAULT 0 NOT NULL,
	`research_runs` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`org_id`, `period`),
	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`digest_hour` integer DEFAULT 8 NOT NULL,
	`reddit_username` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);