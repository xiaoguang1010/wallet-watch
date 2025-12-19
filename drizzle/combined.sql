CREATE TABLE `authenticators` (
	`id` varchar(36) NOT NULL,
	`credential_id` text NOT NULL,
	`credential_public_key` text NOT NULL,
	`counter` bigint NOT NULL,
	`transports` varchar(255),
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `authenticators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`username` varchar(50) NOT NULL,
	`display_name` varchar(100),
	`avatar_url` varchar(1024),
	`current_challenge` varchar(255),
	`locale` varchar(10) NOT NULL DEFAULT 'zh',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `authenticators` ADD CONSTRAINT `authenticators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;CREATE TABLE `monitored_addresses` (
	`id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`address` varchar(255) NOT NULL,
	`chain` varchar(20) NOT NULL,
	`network` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitored_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `monitored_addresses` ADD CONSTRAINT `monitored_addresses_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `cases` ADD `parent_id` varchar(36);--> statement-breakpoint
ALTER TABLE `cases` ADD `level` int DEFAULT 1 NOT NULL;