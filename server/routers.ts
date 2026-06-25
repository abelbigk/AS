import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getCategoriesByUser,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategoriesByCategory,
  getSubcategoryById,
  getAllSubcategoriesByUser,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getContentByCategory,
  getContentBySubcategory,
  getUncategorizedContent,
  getContentByStatus,
  createContentItem,
  updateContentStatus,
  updateContentItem,
  getContentItemById,
  deleteContentItem,
  getUserPreferences,
  upsertUserPreferences,
  getMediaByContentItem,
  getMediaItemById,
  addMediaItem,
  deleteMediaItem,
  getContentByHeading,
  addContentCategoryLink,
  addContentSubcategoryLink,
  getContentLinksCount,
  removeContentCategoryLink,
  removeContentSubcategoryLink,
  searchContentItems,
  reorderCategories,
  reorderSubcategories,
  reorderContentInCategory,
  reorderContentInSubcategory,
  reorderMediaItems,
  listAllSounds,
  getSoundById,
  createSound,
  isSoundInUse,
  deleteSoundRecord,
  setSoundOnContent,
  getSoundUsageCount,
} from "./db";


import { storageDelete } from "./storage";

// Helper — delete a file from R2 storage if a key exists
async function tryDeleteImage(key?: string | null) {
  if (!key) return;
  try {
    await storageDelete(key);
  } catch (err) {
    console.error("[storage] Failed to delete key:", key, err);
  }
}

// Clean up sound from DB and storage if it's no longer used by any content item
async function cleanupUnusedSound(soundId: number | null | undefined) {
  if (!soundId) return;
  try {
    const inUse = await isSoundInUse(soundId);
    if (!inUse) {
      const sound = await getSoundById(soundId);
      if (sound?.key) {
        await tryDeleteImage(sound.key);
      }
      await deleteSoundRecord(soundId);
      console.log(`[SoundCleanup] Deleted unused sound ${soundId}`);
    }
  } catch (err) {
    console.error("[SoundCleanup] Failed to clean up sound:", soundId, err);
  }
}

// Helper to fully delete a content item including its media
async function performDeleteContentItem(itemId: number, userId: number) {
  const item = await getContentItemById(itemId, userId);
  if (!item) return;
  
  await tryDeleteImage(item.posterImageKey);
  const media = await getMediaByContentItem(itemId);
  for (const m of media) {
    await tryDeleteImage(m.key);
  }
  const oldSoundId = item.soundId;
  await deleteContentItem(itemId, userId);
  if (oldSoundId) {
    await cleanupUnusedSound(oldSoundId);
  }
}

const PREDEFINED_CATEGORIES = [
  { name: "Movies" },
  { name: "Food" },
  { name: "Place" },
  { name: "Must" },
  { name: "Quotes" },
  { name: "Business and money management" },
  { name: "How to" },
  { name: "Health" },
  { name: "Workout" },
  { name: "Her" },
  { name: "Games" },
  { name: "Home and Designs" },
  { name: "😈 Time" },
  { name: "Ai and sites" },
  { name: "Books" },
  { name: "Family" },
  { name: "Tech" },
];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Category procedures
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getCategoriesByUser(ctx.user.id);
    }),

    initializePredefined: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        const existing = await getCategoriesByUser(ctx.user.id);
        const existingNames = new Set(existing.map(c => c.name));
        
        for (const cat of PREDEFINED_CATEGORIES) {
          if (!existingNames.has(cat.name)) {
            await createCategory(ctx.user.id, cat.name, undefined, undefined, "yes");
          }
        }
        
        return await getCategoriesByUser(ctx.user.id);
      } catch {
        return [];
      }
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        coverCropData: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createCategory(ctx.user.id, input.name, input.description, input.icon, input.color, "no", input.coverImageUrl, input.coverImageKey, input.coverCropData);
        return await getCategoriesByUser(ctx.user.id);
      }),
    getById: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getCategoryById(input.categoryId, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        coverCropData: z.string().optional(),
        removeCover: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getCategoryById(input.categoryId, ctx.user.id);
        if (existing?.coverImageKey && (input.coverImageKey || input.removeCover)) {
          await tryDeleteImage(existing.coverImageKey);
        }
        await updateCategory(input.categoryId, ctx.user.id, {
          name: input.name,
          description: input.description,
          coverImageUrl: input.removeCover ? null : input.coverImageUrl,
          coverImageKey: input.removeCover ? null : input.coverImageKey,
          ...(input.removeCover ? { coverCropData: null } : input.coverCropData !== undefined ? { coverCropData: input.coverCropData } : {}),
        });
        return await getCategoriesByUser(ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getCategoryById(input.categoryId, ctx.user.id);
        if (!existing) return { success: true };

        // 1. Get all content linked to this category
        const contents = await getContentByCategory(input.categoryId, ctx.user.id);
        for (const item of contents) {
          // Remove this category link
          await removeContentCategoryLink(item.id, input.categoryId);
          // Check if it has any other links (cats or subs)
          const links = await getContentLinksCount(item.id);
          if (links === 0) {
            await performDeleteContentItem(item.id, ctx.user.id);
          }
        }

        // 2. Handle subcategories
        const subs = await getSubcategoriesByCategory(input.categoryId, ctx.user.id);
        for (const sub of subs) {
          // Get content linked to this subcategory
          const subContents = await getContentBySubcategory(sub.id, ctx.user.id);
          for (const item of subContents) {
            await removeContentSubcategoryLink(item.id, sub.id);
            const links = await getContentLinksCount(item.id);
            if (links === 0) {
              await performDeleteContentItem(item.id, ctx.user.id);
            }
          }
          await tryDeleteImage(sub.coverImageKey);
          await deleteSubcategory(sub.id, ctx.user.id);
        }

        await tryDeleteImage(existing.coverImageKey);
        await deleteCategory(input.categoryId, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ categoryIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderCategories(ctx.user.id, input.categoryIds);
        return { success: true };
      }),
  }),

  // Subcategory procedures
  subcategories: router({
    list: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getSubcategoriesByCategory(input.categoryId, ctx.user.id);
      }),

    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await getAllSubcategoriesByUser(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ subcategoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getSubcategoryById(input.subcategoryId, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        coverCropData: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createSubcategory(input.categoryId, ctx.user.id, input.name, input.description, input.coverImageUrl, input.coverImageKey, input.coverCropData);
        return await getSubcategoriesByCategory(input.categoryId, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        subcategoryId: z.number(),
        categoryId: z.number().optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        coverCropData: z.string().optional(),
        removeCover: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getSubcategoryById(input.subcategoryId, ctx.user.id);
        if (existing?.coverImageKey && (input.coverImageKey || input.removeCover)) {
          await tryDeleteImage(existing.coverImageKey);
        }
        await updateSubcategory(input.subcategoryId, ctx.user.id, {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          coverImageUrl: input.removeCover ? null : input.coverImageUrl,
          coverImageKey: input.removeCover ? null : input.coverImageKey,
          ...(input.removeCover ? { coverCropData: null } : input.coverCropData !== undefined ? { coverCropData: input.coverCropData } : {}),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ subcategoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getSubcategoryById(input.subcategoryId, ctx.user.id);
        if (!existing) return { success: true };

        const contents = await getContentBySubcategory(input.subcategoryId, ctx.user.id);
        for (const item of contents) {
          await removeContentSubcategoryLink(item.id, input.subcategoryId);
          
          const links = await getContentLinksCount(item.id);
          if (links === 0) {
            await performDeleteContentItem(item.id, ctx.user.id);
          }
        }

        await tryDeleteImage(existing.coverImageKey);
        await deleteSubcategory(input.subcategoryId, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ categoryId: z.number(), subcategoryIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderSubcategories(ctx.user.id, input.categoryId, input.subcategoryIds);
        return { success: true };
      }),

    getContentCounts: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Get all subcategories for this category
        const subcategories = await getSubcategoriesByCategory(input.categoryId, ctx.user.id);
        const counts: Record<number, number> = {};
        
        // Count content in each subcategory
        for (const sub of subcategories) {
          const content = await getContentBySubcategory(sub.id, ctx.user.id);
          counts[sub.id] = content.length;
        }
        
        return counts;
      }),
  }),

  // Content item procedures
  content: router({
    listByCategory: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        subcategoryId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getContentByCategory(input.categoryId, ctx.user.id, input.subcategoryId);
      }),

    listBySubcategory: protectedProcedure
      .input(z.object({ subcategoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getContentBySubcategory(input.subcategoryId, ctx.user.id);
      }),

    listByStatus: protectedProcedure
      .input(z.enum(["default", "queued", "done"]))
      .query(async ({ ctx, input }) => {
        return await getContentByStatus(ctx.user.id, input);
      }),

    listUncategorized: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUncategorizedContent(ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        categoryIds: z.array(z.number()).optional(),
        subcategoryIds: z.array(z.number()).optional(),
        heading: z.string().min(1),
        description: z.string().optional(),
        posterImageUrl: z.string().optional(),
        posterImageKey: z.string().optional(),
        posterCropData: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Look for existing content with same heading
        const existing = await getContentByHeading(ctx.user.id, input.heading);
        if (existing) {
          // Just add links
          for (const catId of input.categoryIds || []) await addContentCategoryLink(existing.id, catId);
          if (input.subcategoryIds) {
            for (const subId of input.subcategoryIds) await addContentSubcategoryLink(existing.id, subId);
          }
          return existing;
        }

        return await createContentItem(
          ctx.user.id,
          input.heading,
          input.description,
          input.posterImageUrl,
          input.posterImageKey,
          input.posterCropData,
          input.categoryIds || [],
          input.subcategoryIds || []
        );
      }),

    searchExisting: protectedProcedure
      .input(z.object({ heading: z.string() }))
      .query(async ({ ctx, input }) => {
        return await getContentByHeading(ctx.user.id, input.heading);
      }),
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return await searchContentItems(ctx.user.id, input.query);
      }),

    update: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        categoryIds: z.array(z.number()).optional(),
        subcategoryIds: z.array(z.number()).optional(),
        heading: z.string().optional(),
        description: z.string().optional(),
        posterImageUrl: z.string().optional(),
        posterImageKey: z.string().optional(),
        posterCropData: z.string().optional(),
        removePoster: z.boolean().optional(),
        soundId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getContentItemById(input.itemId, ctx.user.id);
        const oldSoundId = existing?.soundId;
        if (existing?.posterImageKey && (input.posterImageKey || input.removePoster)) {
          await tryDeleteImage(existing.posterImageKey);
        }
        await updateContentItem(input.itemId, ctx.user.id, {
          categoryIds: input.categoryIds,
          subcategoryIds: input.subcategoryIds,
          heading: input.heading,
          description: input.description,
          posterImageUrl: input.removePoster ? null : input.posterImageUrl,
          posterImageKey: input.removePoster ? null : input.posterImageKey,
          posterCropData: input.removePoster ? null : input.posterCropData,
          soundId: input.soundId,
        });
        if (input.soundId !== undefined && oldSoundId && oldSoundId !== input.soundId) {
          await cleanupUnusedSound(oldSoundId);
        }
        return { success: true };
      }),

    batchRemoveFromCategory: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        categoryId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        for (const itemId of input.itemIds) {
          const existing = await getContentItemById(itemId, ctx.user.id);
          if (existing) {
            await updateContentItem(itemId, ctx.user.id, {
              categoryIds: existing.categoryIds.filter(id => id !== input.categoryId),
            });
          }
        }
        return { success: true };
      }),

    batchRemoveFromSubcategory: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        subcategoryId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        for (const itemId of input.itemIds) {
          const existing = await getContentItemById(itemId, ctx.user.id);
          if (existing) {
            // Only remove from subcategory, keep category links intact
            await updateContentItem(itemId, ctx.user.id, {
              subcategoryIds: existing.subcategoryIds.filter(id => id !== input.subcategoryId),
            });
          }
        }
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        status: z.enum(["default", "queued", "done"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateContentStatus(input.itemId, ctx.user.id, input.status);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await getContentItemById(input.itemId, ctx.user.id);
        // Delete poster
        await tryDeleteImage(item?.posterImageKey);
        // Delete all media attachments
        const media = await getMediaByContentItem(input.itemId);
        for (const m of media) await tryDeleteImage(m.key);
        await performDeleteContentItem(input.itemId, ctx.user.id);
        return { success: true };
      }),

    reorderInCategory: protectedProcedure
      .input(z.object({ categoryId: z.number(), contentIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderContentInCategory(ctx.user.id, input.categoryId, input.contentIds);
        return { success: true };
      }),

    reorderInSubcategory: protectedProcedure
      .input(z.object({ subcategoryId: z.number(), contentIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderContentInSubcategory(ctx.user.id, input.subcategoryId, input.contentIds);
        return { success: true };
      }),

    getById: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getContentItemById(input.itemId, ctx.user.id);
      }),
  }),

  // Media items (photos/videos inside a content item)
  media: router({
    listByContent: protectedProcedure
      .input(z.object({ contentItemId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getMediaByContentItem(input.contentItemId);
      }),

    add: protectedProcedure
      .input(z.object({
        contentItemId: z.number(),
        url: z.string(),
        key: z.string(),
        type: z.enum(["image", "video"]),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addMediaItem(input.contentItemId, ctx.user.id, input.url, input.key, input.type, input.order ?? 0);
        return await getMediaByContentItem(input.contentItemId);
      }),

    delete: protectedProcedure
      .input(z.object({ mediaId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const media = await getMediaItemById(input.mediaId, ctx.user.id);
        await tryDeleteImage(media?.key);
        await deleteMediaItem(input.mediaId, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ contentItemId: z.number(), mediaItemIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderMediaItems(ctx.user.id, input.contentItemId, input.mediaItemIds);
        return { success: true };
      }),
  }),

  // User preferences procedures
  preferences: router({    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getUserPreferences(ctx.user.id);
      return prefs || { userId: ctx.user.id, theme: "dark" };
    }),

    setTheme: protectedProcedure
      .input(z.enum(["dark", "light"]))
      .mutation(async ({ ctx, input }) => {
        await upsertUserPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // Sound procedures
  sounds: router({
    /** Return all sounds from the shared library (any user can browse) */
    list: protectedProcedure.query(async () => {
      return await listAllSounds();
    }),

    /** Check if a sound is in use by other content items */
    checkUsage: protectedProcedure
      .input(z.object({ soundId: z.number(), excludeContentId: z.number().optional() }))
      .query(async ({ input }) => {
        const count = await getSoundUsageCount(input.soundId, input.excludeContentId);
        return {
          inUseByOthers: count > 0,
          usageCount: count,
        };
      }),

    /** Record a newly uploaded sound file */
    add: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        name: z.string().min(1),
        url: z.string().url(),
        key: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createSound(ctx.user.id, input.title, input.name, input.url, input.key);
      }),

    /** Delete a sound — only if no content item is currently using it */
    delete: protectedProcedure
      .input(z.object({ soundId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const inUse = await isSoundInUse(input.soundId);
        if (inUse) {
          throw new Error("Sound is in use and cannot be deleted");
        }
        const sound = await getSoundById(input.soundId);
        if (sound?.key) {
          await tryDeleteImage(sound.key);
        }
        await deleteSoundRecord(input.soundId);
        return { success: true };
      }),

    /** Assign a sound to a content item (replaces any existing sound) */
    assignToContent: protectedProcedure
      .input(z.object({ contentId: z.number(), soundId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await setSoundOnContent(input.contentId, ctx.user.id, input.soundId);
        return { success: true };
      }),

    /** Remove the sound from a content item (sets soundId to null) */
    removeFromContent: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await setSoundOnContent(input.contentId, ctx.user.id, null);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

