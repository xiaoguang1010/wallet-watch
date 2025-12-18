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
ALTER TABLE `authenticators` ADD CONSTRAINT `authenticators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;