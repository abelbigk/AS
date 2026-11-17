import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTrpcUrl } from "./config";
import type { AppRouter } from "../../../server/routers";

export const trpcVanillaClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getTrpcUrl(),
      transformer: superjson,
      async fetch(url, options) {
        const token = await AsyncStorage.getItem("auth_token");
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
