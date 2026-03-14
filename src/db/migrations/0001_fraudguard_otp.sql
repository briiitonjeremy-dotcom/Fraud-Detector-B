-- Add OTP codes table for two-factor authentication
CREATE TABLE `otp_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'login' NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `otp_codes_user_id_index` ON `otp_codes` (`user_id`);
--> statement-breakpoint
-- Add locked_until and created_by to users
ALTER TABLE `users` ADD `locked_until` integer;
ALTER TABLE `users` ADD `created_by` integer;
--> statement-breakpoint
-- Update role default to viewer
ALTER TABLE `users` DROP DEFAULT;
