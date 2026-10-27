export const invalidQuantityMessage =
  "La cantidad debe ser un número entero mayor a 0.";

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

/** Parses 1–100_000; rejects empty, decimals, and zero. */
export function parsePositiveIntegerQuantity(
  raw: string | number,
): number | null {
  const text = String(raw).trim();

  if (!POSITIVE_INTEGER_PATTERN.test(text)) {
    return null;
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    return null;
  }

  return value;
}

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

/** Parses 0+ for physical counts; rejects empty and decimals. */
export function parseNonNegativeInteger(raw: string | number): number | null {
  const text = String(raw).trim();

  if (!NON_NEGATIVE_INTEGER_PATTERN.test(text)) {
    return null;
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < 0 || value > 100_000) {
    return null;
  }

  return value;
}

/**
 * Parses COP amounts (cost, sale price). Same integer discipline as the
 * count parsers but with a money-sized ceiling — a clipper costs COP 350.000
 * and the 100k count cap silently zeroed it.
 */
export function parseMoneyAmount(raw: string | number): number | null {
  const text = String(raw).trim();

  if (!NON_NEGATIVE_INTEGER_PATTERN.test(text)) {
    return null;
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < 0 || value > 100_000_000) {
    return null;
  }

  return value;
}

const SIGNED_INTEGER_PATTERN = /^-?\d+$/;

/** Parses −100_000…100_000 for stock deltas; rejects empty and decimals. */
export function parseSignedInteger(raw: string | number): number | null {
  const text = String(raw).trim();

  if (!SIGNED_INTEGER_PATTERN.test(text)) {
    return null;
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < -100_000 || value > 100_000) {
    return null;
  }

  return value;
}
