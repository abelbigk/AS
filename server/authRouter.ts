import { router, publicProcedure, protectedProcedure } from "../server/_core/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

const TOKEN_EXPIRY_MOBILE = "365d"; // 1 year for mobile app
const TOKEN_EXPIRY_WEB = "7d"; // 7 days for browser

// Detect if request is from mobile app (Capacitor)
function isMobileApp(userAgent: string): boolean {
  return userAgent.includes("Capacitor") || userAgent.includes("CapacitorHttp");
}

export const authRouter = router({
  // Login with username and password
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { username, password } = input;

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date().toISOString() })
        .where(eq(users.id, user.id));

      // Detect if mobile app or web browser
      const userAgent = ctx.req.headers["user-agent"] || "";
      const tokenExpiry = isMobileApp(userAgent) ? TOKEN_EXPIRY_MOBILE : TOKEN_EXPIRY_WEB;

      // Generate JWT token with appropriate expiry
      const token = await new SignJWT({ userId: user.id, username: user.username })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(tokenExpiry)
        .setIssuedAt()
        .sign(JWT_SECRET);

      return {
        token,
        expiresIn: tokenExpiry,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Register new user (only if no users exist, for initial setup)
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { username, password, name } = input;

      // Check if username already exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if this is the first user (make them admin)
      const allUsers = await db.select().from(users);
      const role = allUsers.length === 0 ? "admin" : "user";

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          name: name || username,
          loginMethod: "local",
          role,
          openId: `local-${username}-${Date.now()}`, // Unique openId for local auth users
        })
        .returning();

      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          role: newUser.role,
        },
      };
    }),

  // Change password (authenticated users only)
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { currentPassword, newPassword } = input;
      const userId = ctx.user.id;

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId));

      return { success: true };
    }),

  // Verify token (check if session is still valid)
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      try {
        const { payload } = await jwtVerify(input.token, JWT_SECRET);
        
        // Check if user still exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId as number))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }

        return {
          valid: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        });
      }
    }),

  // Get current user info
  me: publicProcedure.query(opts => opts.ctx.user),

  // Logout (for JWT auth, this is just a client-side operation, but we keep the endpoint for compatibility)
  logout: publicProcedure.mutation(() => {
    // With JWT, logout is handled client-side by removing the token
    // This endpoint exists for compatibility with the legacy OAuth system
    return { success: true };
  }),
});
