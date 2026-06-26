import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Dev bypass: when OAuth is not configured, use a mock local user
  // Force dev mode if DISABLE_AUTH is set to "true"
  const forceDevMode = process.env.DISABLE_AUTH === "true";
  const isDevMode = forceDevMode || (!ENV.oAuthServerUrl && !ENV.isProduction);
  
  if (isDevMode) {
    user = {
      id: 1,
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

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
