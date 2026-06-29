import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth-storage";
import type { AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: bootstrapped,
    retry: false,
  });

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    (async () => {
      await getAuthToken();
      setBootstrapped(true);
    })();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginMutation.mutateAsync({ username, password });
      await setAuthToken(result.token);
      utils.auth.me.setData(undefined, result.user as AuthUser);
      await utils.invalidate();
    },
    [loginMutation, utils]
  );

  const register = useCallback(
    async (username: string, password: string) => {
      await registerMutation.mutateAsync({ username, password, name: username });
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    }
    await clearAuthToken();
    utils.auth.me.setData(undefined, null);
    await utils.invalidate();
  }, [logoutMutation, utils]);

  const refresh = useCallback(async () => {
    await meQuery.refetch();
  }, [meQuery]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: (meQuery.data as AuthUser | null) ?? null,
      loading: !bootstrapped || meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login,
      register,
      logout,
      refresh,
    }),
    [bootstrapped, login, logout, meQuery.data, meQuery.isLoading, refresh, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
