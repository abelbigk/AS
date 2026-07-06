import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function migrateAuth() {
  const db = getDb();
  
  try {
    console.log("Starting authentication migration...");

    // Check if columns already exist
    const tableInfo = await db.all(sql`PRAGMA table_info(users)`);
    const existingColumns = new Set(tableInfo.map((col: any) => col.name));

    if (!existingColumns.has("username")) {
      console.log("Adding username column...");
      await db.run(sql`ALTER TABLE users ADD COLUMN username TEXT`);
    }

    if (!existingColumns.has("password")) {
      console.log("Adding password column...");
      await db.run(sql`ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
    }

    // Make openId nullable if it isn't already (SQLite doesn't support ALTER COLUMN directly)
    // We'll need to check if there's data and handle it differently
    console.log("Checking openId constraint...");
    const openIdCol = (tableInfo as any[]).find((col: any) => col.name === "openId");
    
    if (openIdCol && openIdCol.notnull === 1) {
      console.log("openId is NOT NULL, updating existing records...");
      // Update any existing records to have a unique openId if they don't have one
      await db.run(sql`UPDATE users SET openId = 'legacy-' || id WHERE openId IS NULL OR openId = ''`);
    }

    // Create unique index for username if it doesn't exist
    try {
      await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`);
      console.log("Created unique index for username");
    } catch (error) {
      console.log("Username index may already exist");
    }

    console.log("✅ Authentication migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrateAuth().catch(console.error);
