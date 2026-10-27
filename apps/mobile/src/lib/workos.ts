import {
  AuthRequest,
  CodeChallengeMethod,
  makeRedirectUri,
} from "expo-auth-session";
import { z } from "zod";

const clientId = process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID;

if (!clientId) {
  throw new Error(
    "EXPO_PUBLIC_WORKOS_CLIENT_ID is not set. Copy apps/mobile/.env.example to apps/mobile/.env.local and set the WorkOS client id.",
  );
}

const WORKOS_API = "https://api.workos.com/user_management";

export const workosDiscovery = {
  authorizationEndpoint: `${WORKOS_API}/authorize`,
};

/** The session request failed because WorkOS rejected the grant (expired, revoked, or invalid). */
export class WorkOSAuthError extends Error {
  name = "WorkOSAuthError";
}

/** The session request failed for a transient reason (network, server, rate limit). */
export class WorkOSRequestError extends Error {
  name = "WorkOSRequestError";
}

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  profile_picture_url: z.string().nullish(),
});

const sessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: userSchema,
});

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

export type WorkOSSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

/** Builds a PKCE authorization request for hosted AuthKit. Call `promptAsync(workosDiscovery, …)` on it. */
export function buildAuthorizeRequest() {
  return new AuthRequest({
    clientId: clientId as string,
    redirectUri: makeRedirectUri({
      scheme: "panabarbero",
      path: "auth/callback",
    }),
    usePKCE: true,
    codeChallengeMethod: CodeChallengeMethod.S256,
    extraParams: { provider: "authkit" },
  });
}

async function authenticate(
  body: Record<string, string>,
): Promise<WorkOSSession> {
  let response: Response;
  try {
    response = await fetch(`${WORKOS_API}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, ...body }),
    });
  } catch (error) {
    throw new WorkOSRequestError("WorkOS authenticate request failed", {
      cause: error,
    });
  }

  if (!response.ok) {
    const message = `WorkOS authenticate failed with status ${response.status}`;
    // 4xx (except rate limiting) means the grant itself is not valid.
    if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 429
    ) {
      throw new WorkOSAuthError(message);
    }
    throw new WorkOSRequestError(message);
  }

  const parsed = sessionSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new WorkOSRequestError("WorkOS authenticate response is malformed", {
      cause: parsed.error,
    });
  }

  const { access_token, refresh_token, user } = parsed.data;
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      profilePictureUrl: user.profile_picture_url ?? null,
    },
  };
}

export function exchangeCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  return authenticate({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
}

/** Refresh tokens rotate: always persist the returned `refreshToken`. */
export function refreshSession(refreshToken: string) {
  return authenticate({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** Returns the JWT `exp` claim in milliseconds, or `null` when it cannot be read. */
export function decodeJwtExp(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}
