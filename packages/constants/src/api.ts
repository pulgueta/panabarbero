export const API_HEADER = "X-Api-Id" as const;

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const CACHE_KEYS = {
  BARBERSHOP: "barbershop",
  BARBERSHOP_SLUG: (slug: string) => `${CACHE_KEYS.BARBERSHOP}:slug:${slug}`,
  BARBERSHOP_BY_ID: (id: string) => `${CACHE_KEYS.BARBERSHOP}:id:${id}`,
} as const;
