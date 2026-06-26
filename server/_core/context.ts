import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { getDb } from "../../server/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const db = getDb();

  // Try to get token from Authorization header
  const authHeader = opts.req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.userId as number;
      
      // Get user from database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (dbUser) {
        user = dbUser;
      }
    } catch (error) {
      // Token invalid or expired, user stays null
      console.log("[Auth] Invalid or expired token");
    }
  }

  // Legacy: Dev bypass for OAuth (if still needed during development)
  if (!user && process.env.DISABLE_AUTH === "true") {
    console.log("[Context] DISABLE_AUTH=true - auto-authenticated as Dev User");
    user = {
      id: 1,
      username: "dev",
      password: "",
      openId: "dev-local-user",
      name: "Dev User",
      email: "dev@localhost",
      loginMethod: "dev",
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSignedIn: new Date().toISOString(),
    };
    return { req: opts.req, res: opts.res, user };
  }

  // Legacy: Try OAuth if available
  if (!user && ENV.oAuthServerUrl) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
