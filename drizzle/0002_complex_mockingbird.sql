ALTER TABLE `cases` ADD `parent_id` varchar(36);--> statement-breakpoint
ALTER TABLE `cases` ADD `level` int DEFAULT 1 NOT NULL;