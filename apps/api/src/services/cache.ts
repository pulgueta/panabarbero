import type { output, ZodType } from "zod";

import { redis } from "@/config/redis";

export async function getCacheFromKey<
  K extends string = string,
  Result extends ZodType = ZodType,
>(key: K, schema?: Result): Promise<output<Result> | null> {
  const cacheResult = await redis.get(key);

  if (schema && "safeParse" in schema) {
    const validated = schema?.safeParse(cacheResult);

    return validated?.success ? validated.data : null;
  }

  return cacheResult
    ? (JSON.parse(cacheResult) as unknown as output<Result>)
    : null;
}

export async function setCacheFromKey<
  K extends string = string,
  Content extends object = object,
>(key: K, value: Content) {
  await redis.set(key, JSON.stringify(value));
}

export async function deleteCacheFromKey<K extends string = string>(key: K) {
  await redis.del(key);
}

export async function updateExistingCache<
  K extends string = string,
  Content extends object = object,
>(key: K, value: Content) {
  const existingCache = await getCacheFromKey(key);

  if (existingCache) {
    await setCacheFromKey(key, { ...existingCache, ...value });
  }

  await setCacheFromKey(key, value);
}
