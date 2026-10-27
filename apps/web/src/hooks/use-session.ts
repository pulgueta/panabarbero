import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type {
  NoUserInfo,
  UserInfo,
} from "@workos/authkit-tanstack-react-start";
import { getAuth } from "@workos/authkit-tanstack-react-start";
import {
  useAccessToken,
  useAuth,
} from "@workos/authkit-tanstack-react-start/client";
import { useCallback, useMemo } from "react";

export type WorkosAuthState = Omit<UserInfo, "accessToken"> | NoUserInfo;

export const fetchWorkosAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const auth = await getAuth();

    if (!auth.user) {
      return { userId: null, token: null, authState: auth };
    }

    const { accessToken, ...authState } = auth;

    return { userId: auth.user.id, token: accessToken, authState };
  },
);

// Auth only changes through full-page redirects (hosted AuthKit login/logout),
// so the snapshot is fetched once per SSR request and reused on the client for
// every navigation/preload instead of paying a server-fn round-trip each time.
export function getWorkosAuthQueryOptions() {
  return queryOptions({
    queryKey: ["workosAuth"],
    queryFn: () => fetchWorkosAuth(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

export function getSessionQueryOptions() {
  return convexQuery(api.auth.getCurrentUser);
}

export function useSession() {
  return useSuspenseQuery(getSessionQueryOptions());
}

export function useAuthFromWorkOS() {
  const { loading, user } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) {
        return null;
      }

      if (forceRefreshToken) {
        return (await refresh()) ?? null;
      }

      return (await getAccessToken()) ?? null;
    },
    [user, refresh, getAccessToken],
  );

  return useMemo(
    () => ({
      isLoading: loading,
      isAuthenticated: !!user,
      fetchAccessToken,
    }),
    [loading, user, fetchAccessToken],
  );
}
