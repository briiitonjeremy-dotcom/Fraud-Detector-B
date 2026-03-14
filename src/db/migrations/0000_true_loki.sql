CREATE TABLE `admin_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`row_count` integer NOT NULL,
	`fraud_count` integer NOT NULL,
	`processed_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` text NOT NULL,
	`step` integer NOT NULL,
	`amount` real NOT NULL,
	`name_orig` text,
	`old_balance_orig` real,
	`new_balance_orig` real,
	`name_dest` text,
	`old_balance_dest` real,
	`new_balance_dest` real,
	`type` text,
	`is_fraud` integer,
	`fraud_score` real,
	`risk_level` text,
	`vendor` text,
	`region` text,
	`is_reviewed` integer DEFAULT false NOT NULL,
	`is_escalated` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_transaction_id_unique` ON `transactions` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`password_hash` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login` integer,
	`login_attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);