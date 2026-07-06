import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminUser() {
  const db = getDb();

  try {
    // Check if any users exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log("\n⚠️  Users already exist in the database:");
      existingUsers.forEach((u) => {
        console.log(`  - ${u.username} (${u.role})`);
      });
      
      const proceed = await question("\nDo you want to create another user? (yes/no): ");
      if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
        console.log("Aborted.");
        rl.close();
        return;
      }
    }

    console.log("\n=== Create Admin User ===\n");

    const username = await question("Enter username: ");
    if (!username.trim() || username.length < 3) {
      console.error("❌ Username must be at least 3 characters");
      rl.close();
      return;
    }

    // Check if username already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim()));
    
    if (existing.length > 0) {
      console.error(`❌ Username "${username}" already exists`);
      rl.close();
      return;
    }

    const password = await question("Enter password (min 6 characters): ");
    if (!password || password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      rl.close();
      return;
    }

    const confirmPassword = await question("Confirm password: ");
    if (password !== confirmPassword) {
      console.error("❌ Passwords do not match");
      rl.close();
      return;
    }

    const name = await question("Enter display name (optional): ");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username: username.trim(),
        password: hashedPassword,
        name: name.trim() || username.trim(),
        loginMethod: "local",
        role: existingUsers.length === 0 ? "admin" : "user",
        openId: null,
      })
      .returning();

    console.log("\n✅ User created successfully!");
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log("\nYou can now login with these credentials.");

    rl.close();
  } catch (error) {
    console.error("❌ Failed to create user:", error);
    rl.close();
    throw error;
  }
}

createAdminUser().catch(console.error);
