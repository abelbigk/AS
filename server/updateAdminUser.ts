import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function updateAdminUser() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO credentials not set");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  try {
    console.log("\n🔄 Updating admin user...\n");
    
    // Update the admin user's display name
    await db.run(sql`UPDATE users SET name = 'Admin User' WHERE username = 'admin'`);
    
    console.log("✅ Admin user updated!");
    console.log("   Name changed to: Admin User\n");
    
    // Show updated user
    const users = await db.all(sql`SELECT username, name, role FROM users WHERE username = 'admin'`);
    console.log("Current admin user:");
    console.log(users);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

updateAdminUser().catch(console.error);
