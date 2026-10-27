/**
 * Sort contract for the barbershops listing. Lives outside the route module so
 * the route, the filter bar and the query hook can all import it without the
 * hook/domain layer depending on a route file.
 */
export const BARBERSHOP_SORTS = ["rating", "reviews", "name"] as const;

export type BarbershopSort = (typeof BARBERSHOP_SORTS)[number];

/** Sort applied when the URL carries no explicit `sort`. */
export const DEFAULT_BARBERSHOP_SORT: BarbershopSort = "rating";
