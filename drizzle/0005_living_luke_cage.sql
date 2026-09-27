ALTER TABLE `users` ADD `googleSub` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `pictureUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_googleSub_unique` UNIQUE(`googleSub`);