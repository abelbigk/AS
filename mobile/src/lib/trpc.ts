import { createTRPCReact } from "@trpc/react-query";

/**
 * Typed against the server router at runtime. For strict compile-time types,
 * run typecheck from the monorepo root where server deps are installed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppRouter = any;

export const trpc = createTRPCReact<AppRouter>();
