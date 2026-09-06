CREATE TABLE `aa_inbound` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`intent` text NOT NULL,
	`area_code` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aa_inbound_phone_created` ON `aa_inbound` (`phone`,`created_at`);--> statement-breakpoint
CREATE TABLE `aa_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area_code` text NOT NULL,
	`level` text NOT NULL,
	`headline` text NOT NULL,
	`actions` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`observed_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`operator` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aa_status_area_observed` ON `aa_status` (`area_code`,`observed_at`,`id`);--> statement-breakpoint
CREATE TABLE `aa_subscriber` (
	`phone` text PRIMARY KEY NOT NULL,
	`area_code` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
