CREATE TABLE `hospitalCapabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hospitalId` int NOT NULL,
	`capabilityKey` varchar(64) NOT NULL,
	`level` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hospitalCapabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `hospital_capability_unique` UNIQUE(`hospitalId`,`capabilityKey`)
);
--> statement-breakpoint
CREATE TABLE `hospitals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(96) NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortName` varchar(32),
	`ownership` varchar(128) NOT NULL,
	`facilityLevel` varchar(128) NOT NULL,
	`grade` int,
	`lga` varchar(96) NOT NULL,
	`ward` varchar(128),
	`latitude` varchar(48),
	`longitude` varchar(48),
	`active` boolean NOT NULL DEFAULT false,
	`sourceNote` text,
	`isIllustrative` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hospitals_id` PRIMARY KEY(`id`),
	CONSTRAINT `hospitals_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `patientProfiles` (
	`id` varchar(96) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`patientReference` varchar(96) NOT NULL,
	`conditionSummary` text NOT NULL,
	`sourceHospitalId` int,
	`isDemonstration` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patientProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `patientProfiles_patientReference_unique` UNIQUE(`patientReference`)
);
--> statement-breakpoint
CREATE TABLE `referralHandoffs` (
	`id` varchar(96) NOT NULL,
	`profileId` varchar(96) NOT NULL,
	`sourceHospitalId` int,
	`destinationHospitalId` int NOT NULL,
	`surgeryTypeId` varchar(96) NOT NULL,
	`referralStatus` enum('prepared','sent','accepted') NOT NULL DEFAULT 'prepared',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referralHandoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hospitalCapabilities` ADD CONSTRAINT `hospitalCapabilities_hospitalId_hospitals_id_fk` FOREIGN KEY (`hospitalId`) REFERENCES `hospitals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patientProfiles` ADD CONSTRAINT `patientProfiles_sourceHospitalId_hospitals_id_fk` FOREIGN KEY (`sourceHospitalId`) REFERENCES `hospitals`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralHandoffs` ADD CONSTRAINT `referralHandoffs_profileId_patientProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `patientProfiles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralHandoffs` ADD CONSTRAINT `referralHandoffs_sourceHospitalId_hospitals_id_fk` FOREIGN KEY (`sourceHospitalId`) REFERENCES `hospitals`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralHandoffs` ADD CONSTRAINT `referralHandoffs_destinationHospitalId_hospitals_id_fk` FOREIGN KEY (`destinationHospitalId`) REFERENCES `hospitals`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hospitals_active_idx` ON `hospitals` (`active`);--> statement-breakpoint
CREATE INDEX `referral_destination_idx` ON `referralHandoffs` (`destinationHospitalId`);