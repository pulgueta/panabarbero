import type { Barbershop } from "@panabarbero/db/schema/zod";

export const QUERY_KEYS = {
  HELLO: ["hello"],
  BARBERSHOP: ["barbershop"],
  BARBERSHOP_BY_UUID: (uuid: Barbershop["uuid"]) => [
    ...QUERY_KEYS.BARBERSHOP,
    uuid,
  ],
} as const;
