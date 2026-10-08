ALTER TABLE `projects` ADD `search_terms_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `sources_json` text DEFAULT '[]' NOT NULL;