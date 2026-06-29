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
import { themes, type AppTheme, type ThemeMode } from "@/theme/colors";
import { useAuth } from "@/context/AuthContext";

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const prefsQuery = trpc.preferences.get.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated,
  });
  const setThemeMutation = trpc.preferences.setTheme.useMutation();

  useEffect(() => {
    if (prefsQuery.data?.theme) {
      setModeState(prefsQuery.data.theme);
    }
  }, [prefsQuery.data?.theme]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      if (isAuthenticated) {
        setThemeMutation.mutate(next);
      }
    },
    [isAuthenticated, setThemeMutation]
  );

  const value = useMemo(
    () => ({
      theme: themes[mode],
      mode,
      setMode,
    }),
    [mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
