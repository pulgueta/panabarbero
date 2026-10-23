/* oxlint-disable typescript/no-deprecated -- this file runs the deprecated methods side by side with their replacement */

// Proves that each `queryClient.query(...)` form used in src/ behaves like the
// deprecated method it replaced (commit 684d7e8b). The deprecated methods
// still exist in @tanstack/query-core 5.104, so each case runs both forms on
// two identically seeded clients and compares the observable outcome.

import type { QueryClientConfig } from "@tanstack/react-query";
import { noop, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const START = Date.UTC(2026, 0, 1);
const KEY = ["migration", "probe"];

// Mirrors src/router.tsx: a finite client staleTime and client-wide retries.
const CLIENT_CONFIG: QueryClientConfig = {
  defaultOptions: { queries: { staleTime: 30_000, retry: 2, retryDelay: 0 } },
};

type QueryFn = () => Promise<string>;
type ProbeOptions = {
  queryKey: string[];
  queryFn: QueryFn;
  staleTime?: number;
  gcTime?: number;
};
type BuildOptions = (queryFn: QueryFn) => ProbeOptions;

// The option kinds the loaders pass. No factory in src/ sets `select` or
// `revalidateIfStale`.
const LOADER_OPTIONS = {
  // convexQuery(...) sets staleTime: Infinity.
  convexQuery: (queryFn) => ({
    queryKey: KEY,
    queryFn,
    staleTime: Number.POSITIVE_INFINITY,
  }),
  // getWorkosAuthQueryOptions() in src/hooks/use-session.ts.
  workosAuth: (queryFn) => ({
    queryKey: KEY,
    queryFn,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  }),
  // saleProofUrlQueryOptions() and the `staleTime: 0` auth re-check.
  zeroStaleTime: (queryFn) => ({
    queryKey: KEY,
    queryFn,
    staleTime: 0,
    gcTime: 0,
  }),
  finiteStaleTime: (queryFn) => ({ queryKey: KEY, queryFn, staleTime: 1000 }),
  clientDefaults: (queryFn) => ({ queryKey: KEY, queryFn }),
} satisfies Record<string, BuildOptions>;

type CacheState = "empty" | "fresh" | "stale" | "invalidated";
const CACHE_STATES: CacheState[] = ["empty", "fresh", "stale", "invalidated"];

type Call = (
  client: QueryClient,
  options: ProbeOptions,
) => Promise<string | null>;
type Outcome =
  | { status: "resolved"; value: string | null }
  | { status: "rejected"; reason: string };
type Migration = { old: Call; new: Call };

// Old form → new form, exactly as written at the call sites.
const ensureQueryData = {
  old: (client, options) => client.ensureQueryData(options),
  new: (client, options) => client.query({ ...options, staleTime: "static" }),
} satisfies Migration;

const fetchQuery = {
  old: (client, options) => client.fetchQuery(options),
  new: (client, options) => client.query(options),
} satisfies Migration;

const prefetchQuery = {
  // The call sites discard the value (`void`), so only settling matters:
  // both forms map to `null` once they settle.
  old: (client, options) =>
    client.prefetchQuery(options).then(() => null),
  new: (client, options) =>
    client
      .query(options)
      .catch(noop)
      .then(() => null),
} satisfies Migration;

const MIGRATIONS: [string, Migration][] = [
  ["await ensureQueryData(o) → await query({ ...o, staleTime: 'static' })", ensureQueryData],
  ["fetchQuery(o) → query(o)", fetchQuery],
  ["void prefetchQuery(o) → void query(o).catch(noop)", prefetchQuery],
];

async function seededClient(cache: CacheState) {
  vi.setSystemTime(START);
  const client = new QueryClient(CLIENT_CONFIG);

  if (cache !== "empty") {
    client.setQueryData(KEY, "cached");
  }
  if (cache === "invalidated") {
    await client.invalidateQueries({ queryKey: KEY, refetchType: "none" });
  }

  // "stale" ages the data past every finite staleTime in LOADER_OPTIONS.
  vi.setSystemTime(START + (cache === "stale" ? 60_000 : 0));
  return client;
}

async function observe(
  call: Call,
  buildOptions: BuildOptions,
  cache: CacheState,
  fails: boolean,
) {
  const client = await seededClient(cache);
  const queryFn = vi.fn<QueryFn>(() =>
    fails ? Promise.reject(new Error("boom")) : Promise.resolve("fetched"),
  );

  let outcome: Outcome;
  try {
    outcome = {
      status: "resolved",
      value: await call(client, buildOptions(queryFn)),
    };
  } catch (error) {
    outcome = { status: "rejected", reason: String(error) };
  }
  const state = client.getQueryState(KEY);
  client.clear();

  return {
    outcome,
    queryFnCalls: queryFn.mock.calls.length,
    cache: {
      data: state?.data,
      status: state?.status,
      error: state?.error?.message,
      isInvalidated: state?.isInvalidated,
      dataUpdatedAt: state?.dataUpdatedAt,
    },
  };
}

describe("queryClient.query migration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe.each(MIGRATIONS)("%s", (_title, migration) => {
    describe.each(Object.entries(LOADER_OPTIONS))(
      "%s options",
      (_kind, buildOptions) => {
        it.each(CACHE_STATES)(
          "%s cache: same result, fetches and cache state",
          async (cache) => {
            for (const fails of [false, true]) {
              const expected = await observe(
                migration.old,
                buildOptions,
                cache,
                fails,
              );
              await expect(
                observe(migration.new, buildOptions, cache, fails),
              ).resolves.toStrictEqual(expected);
            }
          },
        );
      },
    );
  });

  describe("matrix sanity", () => {
    it("ensureQueryData serves stale or invalidated cache without fetching", async () => {
      for (const cache of ["stale", "invalidated"] as const) {
        const result = await observe(
          ensureQueryData.new,
          LOADER_OPTIONS.zeroStaleTime,
          cache,
          false,
        );
        expect(result.queryFnCalls).toBe(0);
        expect(result.outcome).toStrictEqual({
          status: "resolved",
          value: "cached",
        });
      }
    });

    it("fetchQuery refetches stale data and retries per client default", async () => {
      const result = await observe(
        fetchQuery.new,
        LOADER_OPTIONS.finiteStaleTime,
        "stale",
        true,
      );
      expect(result.queryFnCalls).toBe(3);
      expect(result.outcome).toStrictEqual({
        status: "rejected",
        reason: "Error: boom",
      });
    });

    it("prefetchQuery swallows a failed fetch", async () => {
      const result = await observe(
        prefetchQuery.new,
        LOADER_OPTIONS.convexQuery,
        "empty",
        true,
      );
      expect(result.outcome).toStrictEqual({
        status: "resolved",
        value: null,
      });
      expect(result.cache.status).toBe("error");
    });
  });

  describe("known divergence the audit checked for", () => {
    it("query() applies `select`, ensureQueryData does not", async () => {
      const options = {
        queryKey: KEY,
        queryFn: () => Promise.resolve("fetched"),
        select: (data: string) => data.length,
      };

      await expect(
        new QueryClient().ensureQueryData(options),
      ).resolves.toBe("fetched");
      await expect(
        new QueryClient().query({ ...options, staleTime: "static" }),
      ).resolves.toBe(7);
    });
  });
});
