import { eq, and, like, desc, asc, isNull, or, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import {
  InsertUser,
  users,
  categories,
  subcategories,
  contentItems,
  mediaItems,
  userPreferences,
  contentCategoryLinks,
  contentSubcategoryLinks,
  sounds,
} from "../drizzle/schema";


let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn("[Database] TURSO_DATABASE_URL not set, using local SQLite file");
  }

  const client = createClient({
    url: url ?? "file:local.db",
    authToken: authToken,
  });

  _db = drizzle(client);
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = getDb();

  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

  if (existing.length > 0) {
    await db.update(users).set({
      username: user.username ?? existing[0].username,
      password: user.password ?? existing[0].password,
      name: user.name ?? existing[0].name,
      email: user.email ?? existing[0].email,
      loginMethod: user.loginMethod ?? existing[0].loginMethod,
      lastSignedIn: new Date().toISOString(),
    }).where(eq(users.openId, user.openId));
  } else {
    await db.insert(users).values({
      openId: user.openId,
      username: user.username,
      password: user.password,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? "user",
      lastSignedIn: new Date().toISOString(),
    });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Category queries
export async function getCategoriesByUser(userId: number) {
  const db = getDb();
  return await db.select().from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.order), desc(categories.createdAt));
}

export async function getCategoryById(categoryId: number, userId: number) {
  const db = getDb();
  const result = await db.select().from(categories).where(
    and(eq(categories.id, categoryId), eq(categories.userId, userId))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCategory(
  userId: number, name: string, description?: string, icon?: string, color?: string,
  isPredefined: "yes" | "no" = "no",
  coverImageUrl?: string, coverImageKey?: string, coverCropData?: string
) {
  const db = getDb();
  return await db.insert(categories).values({
    userId, name, description, icon, color, isPredefined, coverImageUrl, coverImageKey, coverCropData
  });
}

export async function updateCategory(
  categoryId: number, userId: number,
  data: { name?: string; description?: string | null; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null }
) {
  const db = getDb();
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.coverImageUrl !== undefined) updateSet.coverImageUrl = data.coverImageUrl;
  if (data.coverImageKey !== undefined) updateSet.coverImageKey = data.coverImageKey;
  if ("coverCropData" in data) updateSet.coverCropData = data.coverCropData ?? null;
  if (Object.keys(updateSet).length === 0) return;
  return await db.update(categories).set(updateSet).where(
    and(eq(categories.id, categoryId), eq(categories.userId, userId))
  );
}

// Junction helpers
export async function addContentCategoryLink(contentId: number, categoryId: number) {
  const db = getDb();
  return await db.insert(contentCategoryLinks).values({ contentId, categoryId });
}

export async function addContentSubcategoryLink(contentId: number, subcategoryId: number) {
  const db = getDb();
  return await db.insert(contentSubcategoryLinks).values({ contentId, subcategoryId });
}

export async function removeContentCategoryLink(contentId: number, categoryId: number) {
  const db = getDb();
  return await db.delete(contentCategoryLinks).where(
    and(eq(contentCategoryLinks.contentId, contentId), eq(contentCategoryLinks.categoryId, categoryId))
  );
}

export async function removeContentSubcategoryLink(contentId: number, subcategoryId: number) {
  const db = getDb();
  return await db.delete(contentSubcategoryLinks).where(
    and(eq(contentSubcategoryLinks.contentId, contentId), eq(contentSubcategoryLinks.subcategoryId, subcategoryId))
  );
}

export async function getItemCategoryAndSubcategoryIds(contentId: number) {
  const db = getDb();
  
  const cats = await db.select({ categoryId: contentCategoryLinks.categoryId })
    .from(contentCategoryLinks)
    .innerJoin(categories, eq(contentCategoryLinks.categoryId, categories.id))
    .where(eq(contentCategoryLinks.contentId, contentId));

  const subs = await db.select({ subcategoryId: contentSubcategoryLinks.subcategoryId })
    .from(contentSubcategoryLinks)
    .innerJoin(subcategories, eq(contentSubcategoryLinks.subcategoryId, subcategories.id))
    .where(eq(contentSubcategoryLinks.contentId, contentId));

  return {
    categoryIds: cats.map(c => c.categoryId),
    subcategoryIds: subs.map(s => s.subcategoryId),
  };
}

export async function getContentLinksCount(contentId: number) {
  const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(contentId);
  return categoryIds.length + subcategoryIds.length;
}

export async function deleteCategory(categoryId: number, userId: number) {
  const db = getDb();
  return await db.delete(categories).where(
    and(eq(categories.id, categoryId), eq(categories.userId, userId))
  );
}

// Subcategory queries
export async function getSubcategoriesByCategory(categoryId: number, userId: number) {
  const db = getDb();
  return await db.select().from(subcategories).where(
    and(eq(subcategories.categoryId, categoryId), eq(subcategories.userId, userId))
  ).orderBy(asc(subcategories.order), desc(subcategories.createdAt));
}

export async function getSubcategoryById(subcategoryId: number, userId: number) {
  const db = getDb();
  const result = await db.select().from(subcategories).where(
    and(eq(subcategories.id, subcategoryId), eq(subcategories.userId, userId))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSubcategoriesByUser(userId: number) {
  const db = getDb();
  return await db.select().from(subcategories).where(eq(subcategories.userId, userId)).orderBy(desc(subcategories.createdAt));
}

export async function deleteSubcategory(subcategoryId: number, userId: number) {
  const db = getDb();
  return await db.delete(subcategories).where(
    and(eq(subcategories.id, subcategoryId), eq(subcategories.userId, userId))
  );
}

export async function createSubcategory(
  categoryId: number, userId: number, name: string, description?: string,
  coverImageUrl?: string, coverImageKey?: string, coverCropData?: string
) {
  const db = getDb();
  return await db.insert(subcategories).values({
    categoryId, userId, name, description, coverImageUrl, coverImageKey, coverCropData
  });
}

export async function updateSubcategory(
  subcategoryId: number, userId: number,
  data: { categoryId?: number; name?: string; description?: string; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null }
) {
  const db = getDb();
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.categoryId !== undefined) updateSet.categoryId = data.categoryId;
  if (data.coverImageUrl !== undefined) updateSet.coverImageUrl = data.coverImageUrl;
  if (data.coverImageKey !== undefined) updateSet.coverImageKey = data.coverImageKey;
  if ("coverCropData" in data) updateSet.coverCropData = data.coverCropData ?? null;
  if (Object.keys(updateSet).length === 0) return;
  return await db.update(subcategories).set(updateSet).where(
    and(eq(subcategories.id, subcategoryId), eq(subcategories.userId, userId))
  );
}

// Content queries
export async function getContentByCategory(
  categoryId: number, userId: number, subcategoryId?: number
) {
  const db = getDb();
  let items;
  if (subcategoryId) {
    items = await db.select({ content: contentItems, subOrder: contentSubcategoryLinks.order })
      .from(contentItems)
      .innerJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
      .where(and(eq(contentSubcategoryLinks.subcategoryId, subcategoryId), eq(contentItems.userId, userId)))
      .orderBy(asc(contentSubcategoryLinks.order), desc(contentItems.createdAt))
      .then(rows => rows.map(r => r.content));
  } else {
    // Only show content that is directly linked to this category
    // Do NOT automatically include content from subcategories
    items = await db.select({ content: contentItems, catOrder: contentCategoryLinks.order })
      .from(contentItems)
      .innerJoin(contentCategoryLinks, and(
        eq(contentItems.id, contentCategoryLinks.contentId),
        eq(contentCategoryLinks.categoryId, categoryId)
      ))
      .where(eq(contentItems.userId, userId))
      .orderBy(asc(contentCategoryLinks.order), desc(contentItems.createdAt))
      .then(rows => rows.map(r => r.content));
  }

  return await Promise.all(items.map(async item => {
    const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(item.id);
    return { ...item, categoryIds, subcategoryIds };
  }));
}

export async function getContentBySubcategory(subcategoryId: number, userId: number) {
  const db = getDb();
  const items = await db.select({ content: contentItems })
    .from(contentItems)
    .innerJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
    .where(and(eq(contentSubcategoryLinks.subcategoryId, subcategoryId), eq(contentItems.userId, userId)))
    .orderBy(asc(contentSubcategoryLinks.order), desc(contentItems.createdAt))
    .then(rows => rows.map(r => r.content));

  return await Promise.all(items.map(async item => {
    const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(item.id);
    return { ...item, categoryIds, subcategoryIds };
  }));
}

export async function getUncategorizedContent(userId: number) {
  const db = getDb();
  const items = await db.select({ content: contentItems })
    .from(contentItems)
    .leftJoin(contentCategoryLinks, eq(contentItems.id, contentCategoryLinks.contentId))
    .leftJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
    .where(
      and(
        eq(contentItems.userId, userId),
        isNull(contentCategoryLinks.categoryId),
        isNull(contentSubcategoryLinks.subcategoryId)
      )
    )
    .then(rows => {
      const seen = new Set<number>();
      const unique: typeof rows = [];
      for (const row of rows) {
        if (row.content && !seen.has(row.content.id)) {
          seen.add(row.content.id);
          unique.push(row);
        }
      }
      return unique.map(r => r.content);
    });
  
  return await Promise.all(items.map(async item => {
    const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(item.id);
    return { ...item, categoryIds, subcategoryIds };
  }));
}

export async function getContentByStatus(userId: number, status: "default" | "queued" | "done") {
  const db = getDb();
  const items = await db.select().from(contentItems).where(
    and(eq(contentItems.userId, userId), eq(contentItems.status, status))
  );

  return await Promise.all(items.map(async item => {
    const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(item.id);
    return { ...item, categoryIds, subcategoryIds };
  }));
}

export async function createContentItem(
  userId: number, heading: string,
  description?: string, posterImageUrl?: string, posterImageKey?: string,
  posterCropData?: string,
  categoryIds: number[] = [], subcategoryIds: number[] = []
) {
  const db = getDb();
  const [result] = await db.insert(contentItems).values({
    userId, heading, description,
    posterImageUrl, posterImageKey, posterCropData,
    status: "default",
  }).returning({ id: contentItems.id });

  const contentId = result.id;
  for (const catId of categoryIds) await addContentCategoryLink(contentId, catId);
  for (const subId of subcategoryIds) await addContentSubcategoryLink(contentId, subId);
  
  return result;
}

export async function getContentByHeading(userId: number, heading: string) {
  const db = getDb();
  const result = await db.select().from(contentItems).where(
    and(eq(contentItems.userId, userId), eq(contentItems.heading, heading))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateContentStatus(
  itemId: number, userId: number, status: "default" | "queued" | "done"
) {
  const db = getDb();
  return await db.update(contentItems).set({ status }).where(
    and(eq(contentItems.id, itemId), eq(contentItems.userId, userId))
  );
}

export async function updateContentItem(
  itemId: number,
  userId: number,
  data: {
    heading?: string;
    description?: string;
    posterImageUrl?: string | null;
    posterImageKey?: string | null;
    posterCropData?: string | null;
    soundId?: number | null;
    categoryIds?: number[];
    subcategoryIds?: number[];
  }
) {
  const db = getDb();
  const updateSet: Record<string, unknown> = {};
  if (data.heading !== undefined) updateSet.heading = data.heading;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.posterImageUrl !== undefined) updateSet.posterImageUrl = data.posterImageUrl;
  if (data.posterImageKey !== undefined) updateSet.posterImageKey = data.posterImageKey;
  if ("posterCropData" in data) updateSet.posterCropData = data.posterCropData ?? null;
  if ("soundId" in data) updateSet.soundId = data.soundId;
  
  if (Object.keys(updateSet).length > 0) {
    await db.update(contentItems).set(updateSet).where(
      and(eq(contentItems.id, itemId), eq(contentItems.userId, userId))
    );
  }

  if (data.categoryIds) {
    await db.delete(contentCategoryLinks).where(eq(contentCategoryLinks.contentId, itemId));
    for (const catId of data.categoryIds) await addContentCategoryLink(itemId, catId);
  }
  if (data.subcategoryIds) {
    await db.delete(contentSubcategoryLinks).where(eq(contentSubcategoryLinks.contentId, itemId));
    for (const subId of data.subcategoryIds) await addContentSubcategoryLink(itemId, subId);
  }
}

export async function getContentItemById(itemId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select({
      item: contentItems,
      sound: {
        id: sounds.id,
        title: sounds.title,
        name: sounds.name,
        url: sounds.url,
        key: sounds.key,
      },
    })
    .from(contentItems)
    .leftJoin(sounds, eq(contentItems.soundId, sounds.id))
    .where(and(eq(contentItems.id, itemId), eq(contentItems.userId, userId)))
    .limit(1);

  if (rows.length === 0) return null;

  const { item, sound } = rows[0];
  const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(itemId);

  return {
    ...item,
    categoryIds,
    subcategoryIds,
    sound: sound?.id ? sound : null,
  };
}


export async function deleteContentItem(itemId: number, userId: number) {
  const db = getDb();
  return await db.delete(contentItems).where(
    and(eq(contentItems.id, itemId), eq(contentItems.userId, userId))
  );
}

export async function getUserPreferences(userId: number) {
  const db = getDb();
  const result = await db.select().from(userPreferences).where(
    eq(userPreferences.userId, userId)
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserPreferences(userId: number, theme: "dark" | "light") {
  const db = getDb();
  const existing = await getUserPreferences(userId);
  if (existing) {
    return await db.update(userPreferences).set({ theme }).where(eq(userPreferences.userId, userId));
  }
  return await db.insert(userPreferences).values({ userId, theme });
}

// Media item queries
export async function getMediaByContentItem(contentItemId: number) {
  const db = getDb();
  return await db.select().from(mediaItems)
    .where(eq(mediaItems.contentItemId, contentItemId))
    .orderBy(mediaItems.order);
}

export async function addMediaItem(
  contentItemId: number, userId: number,
  url: string, key: string, type: "image" | "video", order = 0
) {
  const db = getDb();
  return await db.insert(mediaItems).values({ contentItemId, userId, url, key, type, order });
}

export async function getMediaItemById(mediaId: number, userId: number) {
  const db = getDb();
  const result = await db.select().from(mediaItems).where(
    and(eq(mediaItems.id, mediaId), eq(mediaItems.userId, userId))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteMediaItem(mediaId: number, userId: number) {
  const db = getDb();
  return await db.delete(mediaItems).where(
    and(eq(mediaItems.id, mediaId), eq(mediaItems.userId, userId))
  );
}
export async function searchContentItems(userId: number, query: string) {
  const db = getDb();
  const items = await db.select().from(contentItems).where(
    and(
      eq(contentItems.userId, userId),
      like(contentItems.heading, `%${query}%`)
    )
  ).orderBy(desc(contentItems.createdAt)).limit(100);

  return await Promise.all(items.map(async item => {
    const { categoryIds, subcategoryIds } = await getItemCategoryAndSubcategoryIds(item.id);
    return { ...item, categoryIds, subcategoryIds };
  }));
}

// Reorder operations
export async function reorderCategories(userId: number, categoryIds: number[]) {
  const db = getDb();
  if (categoryIds.length === 0) return;
  const batchUpdates = categoryIds.map((id, index) =>
    db.update(categories)
      .set({ order: index })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
  );
  await db.batch(batchUpdates as [any, ...any]);
}

export async function reorderSubcategories(userId: number, categoryId: number, subcategoryIds: number[]) {
  const db = getDb();
  if (subcategoryIds.length === 0) return;
  const batchUpdates = subcategoryIds.map((id, index) =>
    db.update(subcategories)
      .set({ order: index })
      .where(and(
        eq(subcategories.id, id),
        eq(subcategories.userId, userId),
        eq(subcategories.categoryId, categoryId)
      ))
  );
  await db.batch(batchUpdates as [any, ...any]);
}

export async function reorderContentInCategory(userId: number, categoryId: number, contentIds: number[]) {
  const db = getDb();
  if (contentIds.length === 0) return;
  const batchUpdates = contentIds.map((id, index) =>
    db.update(contentCategoryLinks)
      .set({ order: index })
      .where(and(
        eq(contentCategoryLinks.categoryId, categoryId),
        eq(contentCategoryLinks.contentId, id)
      ))
  );
  await db.batch(batchUpdates as [any, ...any]);
}

export async function reorderContentInSubcategory(userId: number, subcategoryId: number, contentIds: number[]) {
  const db = getDb();
  if (contentIds.length === 0) return;
  const batchUpdates = contentIds.map((id, index) =>
    db.update(contentSubcategoryLinks)
      .set({ order: index })
      .where(and(
        eq(contentSubcategoryLinks.subcategoryId, subcategoryId),
        eq(contentSubcategoryLinks.contentId, id)
      ))
  );
  await db.batch(batchUpdates as [any, ...any]);
}

export async function reorderMediaItems(userId: number, contentItemId: number, mediaItemIds: number[]) {
  const db = getDb();
  if (mediaItemIds.length === 0) return;
  const batchUpdates = mediaItemIds.map((id, index) =>
    db.update(mediaItems)
      .set({ order: index })
      .where(and(
        eq(mediaItems.contentItemId, contentItemId),
        eq(mediaItems.id, id),
        eq(mediaItems.userId, userId)
      ))
  );
  await db.batch(batchUpdates as [any, ...any]);
}


// ─── Sound queries ────────────────────────────────────────────────────────────

/** Return all sounds from all users (shared library) */
export async function listAllSounds() {
  const db = getDb();
  return await db.select().from(sounds).orderBy(desc(sounds.createdAt));
}

export async function getSoundById(soundId: number) {
  const db = getDb();
  const result = await db.select().from(sounds).where(eq(sounds.id, soundId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSound(
  uploadedByUserId: number,
  title: string,
  name: string,
  url: string,
  key: string
) {
  const db = getDb();
  const [row] = await db
    .insert(sounds)
    .values({ uploadedByUserId, title, name, url, key })
    .returning({ id: sounds.id });
  return row;
}

/** Check whether any content item currently references this sound */
export async function isSoundInUse(soundId: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: contentItems.id })
    .from(contentItems)
    .where(eq(contentItems.soundId, soundId))
    .limit(1);
  return rows.length > 0;
}

/** Delete a sound record (caller must check isSoundInUse first) */
export async function deleteSoundRecord(soundId: number) {
  const db = getDb();
  return await db.delete(sounds).where(eq(sounds.id, soundId));
}

/** Assign or remove a sound from a content item */
export async function setSoundOnContent(contentId: number, userId: number, soundId: number | null) {
  const db = getDb();
  return await db
    .update(contentItems)
    .set({ soundId: soundId })
    .where(and(eq(contentItems.id, contentId), eq(contentItems.userId, userId)));
}

/** Check how many content items reference this sound, optionally excluding a specific content item */
export async function getSoundUsageCount(soundId: number, excludeContentId?: number): Promise<number> {
  const db = getDb();
  const conditions = [eq(contentItems.soundId, soundId)];
  if (excludeContentId) {
    conditions.push(ne(contentItems.id, excludeContentId));
  }
  const rows = await db
    .select({ id: contentItems.id })
    .from(contentItems)
    .where(and(...conditions));
  return rows.length;
}


