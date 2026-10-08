CREATE TABLE `org_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`invited_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `org_invites_email_idx` ON `org_invites` (`email`);--> statement-breakpoint
CREATE TABLE `org_members` (
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`org_id`, `user_id`),
	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `org_members_user_idx` ON `org_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `waitlist` (
	`email` text PRIMARY KEY NOT NULL,
	`source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orgs` ADD `polar_subscription_id` text;--> statement-breakpoint
ALTER TABLE `orgs` ADD `plan_status` text;--> statement-breakpoint
ALTER TABLE `orgs` ADD `current_period_end` integer;--> statement-breakpoint
INSERT OR IGNORE INTO `org_members` (`org_id`, `user_id`, `role`) SELECT `id`, `owner_id`, 'owner' FROM `orgs`;
