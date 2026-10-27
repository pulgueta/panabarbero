export const SALE_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
] as const;

export const MAX_SALE_PROOF_SIZE = 8 * 1024 * 1024;
export const SALE_PROOF_ACCEPT = SALE_PROOF_TYPES.join(",");

export type SaleProofContentType = (typeof SALE_PROOF_TYPES)[number];

export function isSaleProofContentType(
  contentType: string,
): contentType is SaleProofContentType {
  return SALE_PROOF_TYPES.some((type) => type === contentType);
}
