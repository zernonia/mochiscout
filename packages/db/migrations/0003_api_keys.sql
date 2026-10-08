ALTER TABLE `api_keys` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `api_keys` ADD `prefix` text;