import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function verifyColumns() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO credentials not set");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  try {
    console.log("\n🔍 Verifying password column in Turso...\n");
    
    // Method 1: PRAGMA table_info
    console.log("Method 1: PRAGMA table_info(users)");
    const pragmaInfo = await db.all(sql`PRAGMA table_info(users)`);
    const columns = (pragmaInfo as any[]).map(col => col.name);
    console.log("Columns found:", columns);
    console.log("Has 'password' column?", columns.includes('password') ? '✅ YES' : '❌ NO');
    console.log("Has 'username' column?", columns.includes('username') ? '✅ YES' : '❌ NO');
    
    // Method 2: Try to SELECT password
    console.log("\nMethod 2: SELECT password from users");
    try {
      const result = await db.all(sql`SELECT username, password FROM users LIMIT 1`);
      console.log("✅ Password column is accessible");
      console.log("Result:", result);
    } catch (error: any) {
      console.log("❌ Cannot access password column:", error.message);
    }

    // Method 3: Full table structure
    console.log("\nMethod 3: Complete table structure");
    console.log("──────────────────────────────────────────────────────────");
    (pragmaInfo as any[]).forEach((col: any, index: number) => {
      console.log(`${index + 1}. Column: "${col.name}"`);
      console.log(`   Type: ${col.type}`);
      console.log(`   Not Null: ${col.notnull ? 'YES' : 'NO'}`);
      console.log(`   Default: ${col.dflt_value || '(none)'}`);
      console.log(`   Primary Key: ${col.pk ? 'YES' : 'NO'}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

verifyColumns().catch(console.error);
