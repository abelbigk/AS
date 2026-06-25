import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(current_timestamp)`).notNull(),
  lastSignedIn: text("lastSignedIn").default(sql`(current_timestamp)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = sqliteTable("categories", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),                        // kept for fallback
  color: text("color"),
  coverImageUrl: text("coverImageUrl"),      // uploaded cover photo or external URL
  coverImageKey: text("coverImageKey"),      // cloudinary key (only for uploaded files)
  coverCropData: text("coverCropData"),      // JSON crop params for URL images
  isPredefined: text("isPredefined", { enum: ["yes", "no"] }).default("no").notNull(),
  order: int("order").default(0).notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(current_timestamp)`).notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const subcategories = sqliteTable("subcategories", {
  id: int("id").primaryKey({ autoIncrement: true }),
  categoryId: int("categoryId").notNull(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  coverImageUrl: text("coverImageUrl"),      // uploaded cover photo or external URL
  coverImageKey: text("coverImageKey"),      // cloudinary key (only for uploaded files)
  coverCropData: text("coverCropData"),      // JSON crop params for URL images
  order: int("order").default(0).notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(current_timestamp)`).notNull(),
});

export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = typeof subcategories.$inferInsert;

/**
 * Sounds — reusable audio tracks that can be assigned to content items.
 * Stored in R2 under sounds/{uploadedByUserId}/{filename}.
 * A sound is only deleted from storage when no content item references it.
 */
export const sounds = sqliteTable("sounds", {
  id: int("id").primaryKey({ autoIncrement: true }),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  title: text("title").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),    // public R2 URL
  key: text("key").notNull(),    // R2 key e.g. sounds/42/filename.mp3
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
});

export type Sound = typeof sounds.$inferSelect;
export type InsertSound = typeof sounds.$inferInsert;

export const contentItems = sqliteTable("contentItems", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  heading: text("heading").notNull(),
  description: text("description"),
  posterImageUrl: text("posterImageUrl"),    // cover/thumbnail shown on card
  posterImageKey: text("posterImageKey"),    // cloudinary key
  posterCropData: text("posterCropData"),    // JSON crop params for URL images
  soundId: int("soundId"),                  // optional FK → sounds.id
  status: text("status", { enum: ["default", "queued", "done"] }).default("default").notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(current_timestamp)`).notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

export const contentCategoryLinks = sqliteTable("contentCategoryLinks", {
  id: int("id").primaryKey({ autoIncrement: true }),
  contentId: int("contentId").notNull(),
  categoryId: int("categoryId").notNull(),
  order: int("order").default(0).notNull(),
});

export const contentSubcategoryLinks = sqliteTable("contentSubcategoryLinks", {
  id: int("id").primaryKey({ autoIncrement: true }),
  contentId: int("contentId").notNull(),
  subcategoryId: int("subcategoryId").notNull(),
  order: int("order").default(0).notNull(),
});

/**
 * Media attachments — multiple photos or videos inside a content item
 * Shown in a gallery/viewer when the content card is tapped
 */
export const mediaItems = sqliteTable("mediaItems", {
  id: int("id").primaryKey({ autoIncrement: true }),
  contentItemId: int("contentItemId").notNull(),
  userId: int("userId").notNull(),
  url: text("url").notNull(),
  key: text("key").notNull(),
  type: text("type", { enum: ["image", "video"] }).default("image").notNull(),
  order: int("order").default(0).notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
});

export type MediaItem = typeof mediaItems.$inferSelect;
export type InsertMediaItem = typeof mediaItems.$inferInsert;

export const userPreferences = sqliteTable("userPreferences", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull().unique(),
  theme: text("theme", { enum: ["dark", "light"] }).default("dark").notNull(),
  createdAt: text("createdAt").default(sql`(current_timestamp)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(current_timestamp)`).notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
