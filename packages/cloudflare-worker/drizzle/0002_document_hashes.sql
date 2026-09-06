ALTER TABLE `documents` ADD `content_hash` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `document_versions` ADD `content_hash` text DEFAULT '' NOT NULL;
