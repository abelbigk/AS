import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function checkTursoUsers() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO credentials not set");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  try {
    // Check table structure
    console.log("\n📋 Users table structure:");
    const tableInfo = await db.all(sql`PRAGMA table_info(users)`);
    (tableInfo as any[]).forEach((col: any) => {
      console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
    });

    // Get all users
    console.log("\n👥 Users in database:");
    const users = await db.all(sql`SELECT * FROM users`);
    
    if ((users as any[]).length === 0) {
      console.log("  (empty - no users)");
    } else {
      (users as any[]).forEach((user: any) => {
        console.log(`\n  User ID: ${user.id}`);
        console.log(`  - username: ${user.username || '(not set)'}`);
        console.log(`  - password: ${user.password ? '(hashed)' : '(not set)'}`);
        console.log(`  - openId: ${user.openId || '(not set)'}`);
        console.log(`  - name: ${user.name || '(not set)'}`);
        console.log(`  - email: ${user.email || '(not set)'}`);
        console.log(`  - loginMethod: ${user.loginMethod || '(not set)'}`);
        console.log(`  - role: ${user.role || '(not set)'}`);
      });
    }
    
    console.log("\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkTursoUsers().catch(console.error);
