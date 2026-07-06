import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function createDefaultAdmin() {
  const db = getDb();

  try {
    // Check if any users exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log("\n⚠️  Users already exist in the database. Skipping admin creation.");
      console.log("Existing users:");
      existingUsers.forEach((u) => {
        console.log(`  - ${u.username} (${u.role})`);
      });
      return;
    }

    console.log("\n=== Creating Default Admin User ===\n");

    const username = "admin";
    const password = "admin123";
    const name = "Admin User";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        name,
        loginMethod: "local",
        role: "admin",
        openId: `local-${username}-${Date.now()}`, // Unique openId for local users
      })
      .returning();

    console.log("✅ Default admin user created successfully!");
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${newUser.role}`);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    throw error;
  }
}

createDefaultAdmin().catch(console.error);
