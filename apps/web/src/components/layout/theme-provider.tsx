import { ScriptOnce } from "@tanstack/react-router";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UserTheme = "light" | "dark" | "system";
export type AppTheme = "light" | "dark";

const themeStorageKey = "ui-theme";
const themes: UserTheme[] = ["light", "dark", "system"];

function getStoredUserTheme(): UserTheme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return stored && themes.includes(stored as UserTheme)
      ? (stored as UserTheme)
      : "system";
  } catch {
    return "system";
  }
}

function setStoredTheme(theme: UserTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {}
}

function getSystemTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function handleThemeChange(userTheme: UserTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "system");
  const resolved = userTheme === "system" ? getSystemTheme() : userTheme;
  root.classList.add(resolved);
  if (userTheme === "system") {
    root.classList.add("system");
  }
}

const themeScript: string = (() => {
  function themeFn() {
    try {
      const stored = localStorage.getItem("ui-theme") || "system";
      const valid = ["light", "dark", "system"].includes(stored)
        ? stored
        : "system";
      if (valid === "system") {
        const sys = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        document.documentElement.classList.add(sys, "system");
      } else {
        document.documentElement.classList.add(valid);
      }
    } catch {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(sys, "system");
    }
  }
  return `(${themeFn.toString()})();`;
})();

type ThemeContextValue = {
  userTheme: UserTheme;
  appTheme: AppTheme;
  setTheme: (theme: UserTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  userTheme: "system",
  appTheme: "light",
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<UserTheme>(getStoredUserTheme);

  // Re-apply the documentElement classes after mount: when React regenerates
  // the tree (hydration mismatch recovery) or the error boundary re-renders
  // RootDocument, <html> is rendered without className and the classes set by
  // the inline ScriptOnce are wiped — flipping the app to light mode.
  useEffect(() => {
    handleThemeChange(userTheme);
  }, [userTheme]);

  useEffect(() => {
    if (userTheme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => handleThemeChange("system");
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [userTheme]);

  const appTheme = userTheme === "system" ? getSystemTheme() : userTheme;

  const setTheme = useCallback((newTheme: UserTheme) => {
    setUserTheme(newTheme);
    setStoredTheme(newTheme);
    handleThemeChange(newTheme);
  }, []);

  const value = useMemo(
    () => ({ userTheme, appTheme, setTheme }),
    [userTheme, appTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ScriptOnce>{themeScript}</ScriptOnce>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = use(ThemeContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}
