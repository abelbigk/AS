import 'dotenv/config';
import { getDb, createContentItem, updateContentItem, getContentItemById } from './db';
import { contentItems } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function test() {
  const db = getDb();
  console.log("Testing createContentItem with location...");
  const created = await createContentItem(
    1,
    "Test Location Item " + Date.now(),
    "Test description",
    undefined,
    undefined,
    undefined,
    [],
    [],
    "9.012345",
    "38.765432",
    "https://maps.google.com/?q=9.012345,38.765432"
  );
  console.log("Created:", created);

  const fetched = await getContentItemById(created.id, 1);
  console.log("Fetched created:", {
    id: fetched?.id,
    heading: fetched?.heading,
    latitude: fetched?.latitude,
    longitude: fetched?.longitude,
    locationLinkUrl: (fetched as any)?.locationLinkUrl,
    location_link_url: (fetched as any)?.location_link_url,
  });

  console.log("Testing updateContentItem with location...");
  await updateContentItem(created.id, 1, {
    latitude: "10.111111",
    longitude: "39.222222",
    locationLinkUrl: "https://example.com/updated",
  });

  const fetchedAfterUpdate = await getContentItemById(created.id, 1);
  console.log("Fetched after update:", {
    id: fetchedAfterUpdate?.id,
    heading: fetchedAfterUpdate?.heading,
    latitude: fetchedAfterUpdate?.latitude,
    longitude: fetchedAfterUpdate?.longitude,
    locationLinkUrl: (fetchedAfterUpdate as any)?.locationLinkUrl,
    location_link_url: (fetchedAfterUpdate as any)?.location_link_url,
  });

  // Clean up
  await db.delete(contentItems).where(eq(contentItems.id, created.id));
  console.log("Cleaned up test item.");
}

test().catch(console.error);
