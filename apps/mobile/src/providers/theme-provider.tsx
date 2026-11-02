import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Uniwind } from "uniwind";

const THEME_KEY = "pb.theme";

export type ThemePreference = "system" | "light" | "dark";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies the stored appearance with Uniwind. Uniwind keeps the theme in
 * memory only, so the choice is persisted in SecureStore. Default is system.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (cancelled || !isThemePreference(stored)) return;
        setPreferenceState(stored);
        Uniwind.setTheme(stored);
      })
      .catch((error) => {
        console.warn("Could not load the theme preference", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    Uniwind.setTheme(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch((error) => {
      console.warn("Could not save the theme preference", error);
    });
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used inside ThemeProvider");
  }
  return context;
}
