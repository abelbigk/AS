import { createTRPCReact } from "@trpc/react-query";
// Import router type directly from server definitions
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
