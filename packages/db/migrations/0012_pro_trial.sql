ALTER TABLE `orgs` ADD `trial_ends_at` integer;--> statement-breakpoint
ALTER TABLE `orgs` ADD `trial_emails` integer DEFAULT 0 NOT NULL;