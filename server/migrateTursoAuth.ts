import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function migrateTursoAuth() {
  // Connect to Turso
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set in .env");
    process.exit(1);
  }

  console.log(`\n🌐 Connecting to Turso: ${url}\n`);

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  try {
    console.log("📋 Checking current users table structure...");
    
    // Check table structure
    const tableInfo = await db.all(sql`PRAGMA table_info(users)`);
    console.log("\nCurrent columns:");
    (tableInfo as any[]).forEach((col: any) => {
      console.log(`  - ${col.name} (${col.type}${col.notnull ? ' NOT NULL' : ''})`);
    });

    const existingColumns = new Set((tableInfo as any[]).map((col: any) => col.name));

    // Add username column if doesn't exist
    if (!existingColumns.has("username")) {
      console.log("\n➕ Adding username column...");
      await db.run(sql`ALTER TABLE users ADD COLUMN username TEXT`);
      console.log("   ✅ Username column added");
    } else {
      console.log("\n✓ Username column already exists");
    }

    // Add password column if doesn't exist
    if (!existingColumns.has("password")) {
      console.log("➕ Adding password column...");
      await db.run(sql`ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
      console.log("   ✅ Password column added");
    } else {
      console.log("✓ Password column already exists");
    }

    // Update existing users to have username if they don't
    console.log("\n🔄 Updating existing users...");
    await db.run(sql`UPDATE users SET username = openId WHERE username IS NULL OR username = ''`);
    console.log("   ✅ Existing users updated with username = openId");

    // Create unique index for username
    try {
      await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`);
      console.log("   ✅ Created unique index for username");
    } catch (error) {
      console.log("   ✓ Username index already exists");
    }

    // Check if there are any users
    const users = await db.all(sql`SELECT id, username, name, role FROM users`);
    console.log(`\n👥 Current users in database: ${(users as any[]).length}`);
    
    if ((users as any[]).length === 0) {
      console.log("\n📝 Creating default admin user...");
      
      const adminUsername = "admin";
      const adminPassword = "admin123";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await db.run(sql`
        INSERT INTO users (username, password, openId, name, loginMethod, role)
        VALUES (${adminUsername}, ${hashedPassword}, ${"local-admin-" + Date.now()}, 'Admin User', 'local', 'admin')
      `);
      
      console.log("   ✅ Admin user created!");
      console.log("   📧 Username: admin");
      console.log("   🔑 Password: admin123");
      console.log("\n   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
    } else {
      console.log("\nExisting users:");
      (users as any[]).forEach((u: any) => {
        console.log(`  - ${u.username || u.name} (${u.role || 'user'})`);
      });
    }

    console.log("\n✅ Migration completed successfully!\n");
    console.log("📋 Next steps:");
    console.log("   1. Deploy your app to Render");
    console.log("   2. Login with admin/admin123");
    console.log("   3. Change password in Settings");
    console.log("");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

migrateTursoAuth().catch(console.error);
