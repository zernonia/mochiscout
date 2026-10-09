ALTER TABLE `projects` ADD `hot_alerts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `last_hot_alert_at` integer;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `reply_ai_draft` text;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `status_changed_at` integer;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `dismiss_reason` text;--> statement-breakpoint
ALTER TABLE `thread_scores` ADD `alerted_at` integer;--> statement-breakpoint
ALTER TABLE `threads` ADD `state` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `threads` ADD `body` text;--> statement-breakpoint
ALTER TABLE `threads` ADD `comments_json` text;--> statement-breakpoint
ALTER TABLE `threads` ADD `context_fetched_at` integer;--> statement-breakpoint
UPDATE `thread_scores` SET `reply_ai_draft` = `reply_draft` WHERE `reply_draft` IS NOT NULL;