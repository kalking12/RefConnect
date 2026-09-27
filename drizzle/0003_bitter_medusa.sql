CREATE TABLE `surgeryCriteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surgeryTypeId` int NOT NULL,
	`capabilityKey` varchar(64) NOT NULL,
	`weight` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surgeryCriteria_id` PRIMARY KEY(`id`),
	CONSTRAINT `surgery_criterion_unique` UNIQUE(`surgeryTypeId`,`capabilityKey`)
);
--> statement-breakpoint
CREATE TABLE `surgeryTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`shortName` varchar(96) NOT NULL,
	`description` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surgeryTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `surgeryTypes_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
ALTER TABLE `referralHandoffs` ADD `profileSnapshot` text NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeryCriteria` ADD CONSTRAINT `surgeryCriteria_surgeryTypeId_surgeryTypes_id_fk` FOREIGN KEY (`surgeryTypeId`) REFERENCES `surgeryTypes`(`id`) ON DELETE cascade ON UPDATE no action;