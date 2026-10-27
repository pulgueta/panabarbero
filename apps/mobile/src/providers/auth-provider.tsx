import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { clearSession, loadSession, saveSession } from "@/lib/session-store";
import {
  buildAuthorizeRequest,
  decodeJwtExp,
  exchangeCode,
  refreshSession,
  type SessionUser,
  WorkOSAuthError,
  type WorkOSSession,
  workosDiscovery,
} from "@/lib/workos";

type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  /** Resolves when the flow ends; a user cancel resolves without signing in. Throws on failure. */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: (options?: {
    forceRefresh?: boolean;
  }) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Refresh the access token when it expires within this window. */
const EXPIRY_MARGIN_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  const refreshTokenRef = useRef<string | null>(null);
  const accessTokenRef = useRef<{ token: string; expiresAt: number } | null>(
    null,
  );
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  // Bumped on sign-out so a refresh that resolves later cannot restore the session.
  const generationRef = useRef(0);

  const resetLocal = useCallback(async () => {
    generationRef.current += 1;
    refreshTokenRef.current = null;
    accessTokenRef.current = null;
    refreshInFlightRef.current = null;
    setUser(null);
    setStatus("signedOut");
    await clearSession();
  }, []);

  const applySession = useCallback(async (session: WorkOSSession) => {
    refreshTokenRef.current = session.refreshToken;
    accessTokenRef.current = {
      token: session.accessToken,
      expiresAt: decodeJwtExp(session.accessToken) ?? 0,
    };
    setUser(session.user);
    setStatus("signedIn");
    await saveSession(session.refreshToken, session.user);
  }, []);

  const refresh = useCallback((): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) return Promise.resolve(null);

    const generation = generationRef.current;
    const run = async () => {
      try {
        const session = await refreshSession(refreshToken);
        if (generation !== generationRef.current) return null;
        await applySession(session);
        return session.accessToken;
      } catch (error) {
        if (
          error instanceof WorkOSAuthError &&
          generation === generationRef.current
        ) {
          await resetLocal();
          return null;
        }
        throw error;
      }
    };
    const promise = run().finally(() => {
      if (refreshInFlightRef.current === promise) {
        refreshInFlightRef.current = null;
      }
    });
    refreshInFlightRef.current = promise;
    return promise;
  }, [applySession, resetLocal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored) {
        setStatus("signedOut");
        return;
      }
      refreshTokenRef.current = stored.refreshToken;
      setUser(stored.user);
      try {
        await refresh();
      } catch {
        // Transient failure (for example offline): keep the stored session and
        // let the next getAccessToken call retry the refresh.
        if (!cancelled) setStatus("signedIn");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getAccessToken = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      const cached = accessTokenRef.current;
      if (
        !forceRefresh &&
        cached &&
        cached.expiresAt - Date.now() > EXPIRY_MARGIN_MS
      ) {
        return cached.token;
      }
      return refresh();
    },
    [refresh],
  );

  const signIn = useCallback(async () => {
    const request = buildAuthorizeRequest();
    const result = await request.promptAsync(workosDiscovery, {
      preferEphemeralSession: true,
    });
    if (result.type === "cancel" || result.type === "dismiss") return;

    const code = result.type === "success" ? result.params.code : undefined;
    if (!code || !request.codeVerifier) {
      throw new Error(
        result.type === "error" && result.error
          ? `WorkOS sign-in failed: ${result.error.code}`
          : "WorkOS sign-in did not return an authorization code",
      );
    }

    const session = await exchangeCode({
      code,
      codeVerifier: request.codeVerifier,
    });
    generationRef.current += 1;
    await applySession(session);
  }, [applySession]);

  const value = useMemo(
    () => ({ status, user, signIn, signOut: resetLocal, getAccessToken }),
    [status, user, signIn, resetLocal, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/** Adapter for `ConvexProviderWithAuth`. */
export function useWorkosConvexAuth() {
  const { status, getAccessToken } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getAccessToken({ forceRefresh: forceRefreshToken });
      } catch {
        return null;
      }
    },
    [getAccessToken],
  );

  return useMemo(
    () => ({
      isLoading: status === "loading",
      isAuthenticated: status === "signedIn",
      fetchAccessToken,
    }),
    [status, fetchAccessToken],
  );
}
