CREATE TABLE `alert_rules` (
	`id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`rule_type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` text NOT NULL,
	`enabled` int NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`address_id` varchar(36),
	`rule_id` varchar(36),
	`alert_type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`severity` varchar(20) NOT NULL DEFAULT 'warning',
	`is_read` int NOT NULL DEFAULT false,
	`triggered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `balance_snapshots` (
	`id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`address_id` varchar(36) NOT NULL,
	`balance_data` text NOT NULL,
	`total_value` decimal(20,2) NOT NULL,
	`snapshot_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `balance_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_address_id_monitored_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `monitored_addresses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_rule_id_alert_rules_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `alert_rules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `balance_snapshots` ADD CONSTRAINT `balance_snapshots_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `balance_snapshots` ADD CONSTRAINT `balance_snapshots_address_id_monitored_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `monitored_addresses`(`id`) ON DELETE cascade ON UPDATE no action;