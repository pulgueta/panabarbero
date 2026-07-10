/** Pure helpers for validating Mercado Pago webhook timestamp freshness. */

export function isWebhookTimestampWithinTolerance(
  xSignature: string | undefined,
  nowMs: number,
  toleranceSeconds: number,
) {
  const timestamp = xSignature
    ?.split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ts="))
    ?.slice(3);

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  return (
    Number.isSafeInteger(timestampSeconds) &&
    Math.abs(nowMs / 1000 - timestampSeconds) <= toleranceSeconds
  );
}
