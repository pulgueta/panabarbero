import { env } from "@/env";

export const redis = new Bun.RedisClient(env.REDIS_URL);
