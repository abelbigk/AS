CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`coverImageUrl` text,
	`coverImageKey` text,
	`coverCropData` text,
	`isPredefined` text DEFAULT 'no' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contentCategoryLinks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contentId` integer NOT NULL,
	`categoryId` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contentItems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`heading` text NOT NULL,
	`description` text,
	`posterImageUrl` text,
	`posterImageKey` text,
	`posterCropData` text,
	`soundId` integer,
	`status` text DEFAULT 'default' NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contentSubcategoryLinks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contentId` integer NOT NULL,
	`subcategoryId` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mediaItems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contentItemId` integer NOT NULL,
	`userId` integer NOT NULL,
	`url` text NOT NULL,
	`key` text NOT NULL,
	`type` text DEFAULT 'image' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uploadedByUserId` integer NOT NULL,
	`title` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`key` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoryId` integer NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`coverImageUrl` text,
	`coverImageKey` text,
	`coverCropData` text,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `userPreferences_userId_unique` ON `userPreferences` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`openId` text,
	`name` text,
	`email` text,
	`loginMethod` text DEFAULT 'local',
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	`lastSignedIn` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);