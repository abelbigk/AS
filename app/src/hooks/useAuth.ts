import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const utils = trpc.useUtils();
  const { token, user, isLoading, setUser, logout } = useAuthStore();

  // Query for current user — only runs when we have a token
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Logout mutation (server-side is a no-op for JWT, but keeps things consistent)
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // Perform logout — clears AsyncStorage + store.
  // RootNavigator watches `token` reactively, so it switches to AuthStack automatically.
  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await logout();
      utils.auth.me.setData(undefined, null);
    }
  }, [logoutMutation, logout, utils]);

  return {
    user: meQuery.data ?? user,
    isLoading: isLoading || meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: !!token,
    logout: handleLogout,
    refresh: () => meQuery.refetch(),
  };
}
