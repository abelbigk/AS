import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getCachedAuthToken } from "./authTokenCache";
import { getTrpcUrl } from "./config";
import type { AppRouter } from "../../../server/routers";

export const trpcVanillaClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getTrpcUrl(),
      transformer: superjson,
      async fetch(url, options) {
        const token = await getCachedAuthToken();
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      },
    }),
  ],
});
