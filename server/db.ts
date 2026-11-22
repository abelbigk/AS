import { eq, and, like, desc, asc, isNull, or, ne, inArray, gte, lte } from "drizzle-orm";
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
  userLocations,
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
export async function getCategoriesByUser(_userId?: number) {
  const db = getDb();
  return await db.select().from(categories)
    .orderBy(asc(categories.order), desc(categories.createdAt));
}

export async function getCategoryById(categoryId: number, _userId?: number) {
  const db = getDb();
  const result = await db.select().from(categories).where(
    eq(categories.id, categoryId)
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
  categoryId: number, _userId?: number,
  data: { name?: string; description?: string | null; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null } = {}
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
    eq(categories.id, categoryId)
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

/**
 * Batched helper that attaches categoryIds and subcategoryIds to multiple content items
 * using only 2 batch queries, completely resolving the N+1 query bottleneck.
 */
export async function attachCategoryAndSubcategoryIds<T extends { id: number }>(
  items: T[]
): Promise<(T & { categoryIds: number[]; subcategoryIds: number[] })[]> {
  if (items.length === 0) return [];
  const db = getDb();
  const contentIds = items.map((item) => item.id);

  const [cats, subs] = await Promise.all([
    db
      .select({
        contentId: contentCategoryLinks.contentId,
        categoryId: contentCategoryLinks.categoryId,
      })
      .from(contentCategoryLinks)
      .innerJoin(categories, eq(contentCategoryLinks.categoryId, categories.id))
      .where(inArray(contentCategoryLinks.contentId, contentIds)),

    db
      .select({
        contentId: contentSubcategoryLinks.contentId,
        subcategoryId: contentSubcategoryLinks.subcategoryId,
      })
      .from(contentSubcategoryLinks)
      .innerJoin(
        subcategories,
        eq(contentSubcategoryLinks.subcategoryId, subcategories.id)
      )
      .where(inArray(contentSubcategoryLinks.contentId, contentIds)),
  ]);

  const catMap = new Map<number, number[]>();
  for (const c of cats) {
    let arr = catMap.get(c.contentId);
    if (!arr) {
      arr = [];
      catMap.set(c.contentId, arr);
    }
    arr.push(c.categoryId);
  }

  const subMap = new Map<number, number[]>();
  for (const s of subs) {
    let arr = subMap.get(s.contentId);
    if (!arr) {
      arr = [];
      subMap.set(s.contentId, arr);
    }
    arr.push(s.subcategoryId);
  }

  return items.map((item) => ({
    ...item,
    categoryIds: catMap.get(item.id) || [],
    subcategoryIds: subMap.get(item.id) || [],
  }));
}

export async function deleteCategory(categoryId: number, _userId?: number) {
  const db = getDb();
  return await db.delete(categories).where(
    eq(categories.id, categoryId)
  );
}

// Subcategory queries
export async function getSubcategoriesByCategory(categoryId: number, _userId?: number) {
  const db = getDb();
  return await db.select().from(subcategories).where(
    eq(subcategories.categoryId, categoryId)
  ).orderBy(asc(subcategories.order), desc(subcategories.createdAt));
}

export async function getSubcategoryById(subcategoryId: number, _userId?: number) {
  const db = getDb();
  const result = await db.select().from(subcategories).where(
    eq(subcategories.id, subcategoryId)
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSubcategoriesByUser(_userId?: number) {
  const db = getDb();
  return await db.select().from(subcategories).orderBy(desc(subcategories.createdAt));
}

export async function deleteSubcategory(subcategoryId: number, _userId?: number) {
  const db = getDb();
  return await db.delete(subcategories).where(
    eq(subcategories.id, subcategoryId)
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
  subcategoryId: number, _userId?: number,
  data: { categoryId?: number; name?: string; description?: string; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null } = {}
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
    eq(subcategories.id, subcategoryId)
  );
}

// Content queries
export async function getContentByCategory(
  categoryId: number, _userId?: number, subcategoryId?: number
) {
  const db = getDb();
  let items;
  if (subcategoryId) {
    items = await db.select({ content: contentItems, subOrder: contentSubcategoryLinks.order })
      .from(contentItems)
      .innerJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
      .where(eq(contentSubcategoryLinks.subcategoryId, subcategoryId))
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
      .orderBy(asc(contentCategoryLinks.order), desc(contentItems.createdAt))
      .then(rows => rows.map(r => r.content));
  }

  return await attachCategoryAndSubcategoryIds(items);
}

export async function getContentBySubcategory(subcategoryId: number, _userId?: number) {
  const db = getDb();
  const items = await db.select({ content: contentItems })
    .from(contentItems)
    .innerJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
    .where(eq(contentSubcategoryLinks.subcategoryId, subcategoryId))
    .orderBy(asc(contentSubcategoryLinks.order), desc(contentItems.createdAt))
    .then(rows => rows.map(r => r.content));

  return await attachCategoryAndSubcategoryIds(items);
}

export async function getUncategorizedContent(_userId?: number) {
  const db = getDb();
  const items = await db.select({ content: contentItems })
    .from(contentItems)
    .leftJoin(contentCategoryLinks, eq(contentItems.id, contentCategoryLinks.contentId))
    .leftJoin(contentSubcategoryLinks, eq(contentItems.id, contentSubcategoryLinks.contentId))
    .where(
      and(
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
  
  return await attachCategoryAndSubcategoryIds(items);
}

export async function getContentByStatus(_userId: number, status: "default" | "queued" | "done") {
  const db = getDb();
  const items = await db.select().from(contentItems).where(
    eq(contentItems.status, status)
  );

  return await attachCategoryAndSubcategoryIds(items);
}

export async function createContentItem(
  userId: number, heading: string,
  description?: string, posterImageUrl?: string, posterImageKey?: string,
  posterCropData?: string,
  categoryIds: number[] = [], subcategoryIds: number[] = [],
  latitude?: string, longitude?: string, locationLinkUrl?: string
) {
  const db = getDb();
  const [result] = await db.insert(contentItems).values({
    userId, heading, description,
    posterImageUrl, posterImageKey, posterCropData,
    status: "default",
    latitude,
    longitude,
    locationLinkUrl,
  }).returning({ id: contentItems.id });

  const contentId = result.id;
  for (const catId of categoryIds) await addContentCategoryLink(contentId, catId);
  for (const subId of subcategoryIds) await addContentSubcategoryLink(contentId, subId);
  
  return result;
}

export async function getContentByHeading(_userId: number, heading: string) {
  const db = getDb();
  const result = await db.select().from(contentItems).where(
    eq(contentItems.heading, heading)
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateContentStatus(
  itemId: number, _userId: number, status: "default" | "queued" | "done"
) {
  const db = getDb();
  return await db.update(contentItems).set({ status }).where(
    eq(contentItems.id, itemId)
  );
}

export async function updateContentItem(
  itemId: number,
  _userId: number,
  data: {
    heading?: string;
    description?: string;
    posterImageUrl?: string | null;
    posterImageKey?: string | null;
    posterCropData?: string | null;
    soundId?: number | null;
    latitude?: string | null;
    longitude?: string | null;
    locationLinkUrl?: string | null;
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
  if ("latitude" in data) updateSet.latitude = data.latitude ?? null;
  if ("longitude" in data) updateSet.longitude = data.longitude ?? null;
  if ("locationLinkUrl" in data) updateSet.locationLinkUrl = data.locationLinkUrl ?? null;
  
  if (Object.keys(updateSet).length > 0) {
    await db.update(contentItems).set(updateSet).where(
      eq(contentItems.id, itemId)
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

export async function getContentItemById(itemId: number, _userId?: number) {
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
    .where(eq(contentItems.id, itemId))
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


export async function deleteContentItem(itemId: number, _userId?: number) {
  const db = getDb();
  return await db.delete(contentItems).where(
    eq(contentItems.id, itemId)
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

export async function getMediaItemById(mediaId: number, _userId?: number) {
  const db = getDb();
  const result = await db.select().from(mediaItems).where(
    eq(mediaItems.id, mediaId)
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteMediaItem(mediaId: number, _userId?: number) {
  const db = getDb();
  return await db.delete(mediaItems).where(
    eq(mediaItems.id, mediaId)
  );
}
export async function searchContentItems(_userId: number, query: string) {
  const db = getDb();
  const items = await db.select().from(contentItems).where(
    like(contentItems.heading, `%${query}%`)
  ).orderBy(desc(contentItems.createdAt)).limit(100);

  return await attachCategoryAndSubcategoryIds(items);
}

// Reorder operations
export async function reorderCategories(_userId: number, categoryIds: number[]) {
  const db = getDb();
  if (categoryIds.length === 0) return;
  const batchUpdates = categoryIds.map((id, index) =>
    db.update(categories)
      .set({ order: index })
      .where(eq(categories.id, id))
  );
  await db.batch(batchUpdates as [any, ...any]);
}

export async function reorderSubcategories(_userId: number, categoryId: number, subcategoryIds: number[]) {
  const db = getDb();
  if (subcategoryIds.length === 0) return;
  const batchUpdates = subcategoryIds.map((id, index) =>
    db.update(subcategories)
      .set({ order: index })
      .where(and(
        eq(subcategories.id, id),
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

export async function reorderMediaItems(_userId: number, contentItemId: number, mediaItemIds: number[]) {
  const db = getDb();
  if (mediaItemIds.length === 0) return;
  const batchUpdates = mediaItemIds.map((id, index) =>
    db.update(mediaItems)
      .set({ order: index })
      .where(and(
        eq(mediaItems.contentItemId, contentItemId),
        eq(mediaItems.id, id)
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
export async function setSoundOnContent(contentId: number, _userId: number, soundId: number | null) {
  const db = getDb();
  return await db
    .update(contentItems)
    .set({ soundId: soundId })
    .where(eq(contentItems.id, contentId));
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

// ─── Location tracking queries ───────────────────────────────────────────────

export async function recordUserLocation(data: {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
}) {
  const db = getDb();
  return await db.insert(userLocations).values({
    userId: data.userId,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy ?? null,
    speed: data.speed ?? null,
    heading: data.heading ?? null,
    altitude: data.altitude ?? null,
    timestamp: data.timestamp,
  });
}

export async function getUserLocationsByDate(
  userId: number,
  dateStr: string,
  startIso?: string,
  endIso?: string
) {
  const db = getDb();
  let start = startIso;
  let end = endIso;

  if (!start || !end) {
    // Automatically convert dateStr (e.g. "2026-11-23") in UTC+3 (Nairobi) to UTC ISO boundaries:
    // Nairobi midnight = UTC 00:00 minus 3 hours = UTC (day-1) 21:00
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 3 * 3600 * 1000).toISOString();
      end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 3 * 3600 * 1000).toISOString();
    }
  }

  if (start && end) {
    return await db
      .select()
      .from(userLocations)
      .where(
        and(
          eq(userLocations.userId, userId),
          gte(userLocations.timestamp, start),
          lte(userLocations.timestamp, end)
        )
      )
      .orderBy(asc(userLocations.timestamp));
  }
  return await db
    .select()
    .from(userLocations)
    .where(
      and(
        eq(userLocations.userId, userId),
        like(userLocations.timestamp, `${dateStr}%`)
      )
    )
    .orderBy(asc(userLocations.timestamp));
}

export async function getLatestUserLocation(userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.userId, userId))
    .orderBy(desc(userLocations.timestamp))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function getAllUsers() {
  const db = getDb();
  return await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(asc(users.id));
}


