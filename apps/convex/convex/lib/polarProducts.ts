import { getPolarClient } from "./polarClient";

export interface PolarProduct {
  productId: string;
  slug: string;
  name: string;
  description: string | null;
  isRecurring: boolean;
  isArchived: boolean;
}

/**
 * Retrieves all products from your Polar organization and transforms them
 * into a simplified format with product IDs and URL-friendly slugs.
 */
export async function getPolarProducts(): Promise<PolarProduct[]> {
  const polar = getPolarClient();

  const products = await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID!,
    isArchived: false,
  });

  return products.result.items.map((product) => ({
    productId: product.id,
    slug: product.name.toLowerCase().replace(/ /g, "-"),
    name: product.name,
    description: product.description,
    isRecurring: product.isRecurring,
    isArchived: product.isArchived,
  }));
}

/**
 * Retrieves the full product list from Polar without transformation,
 * useful when you need access to all product properties.
 */
export async function getRawPolarProducts() {
  const polar = getPolarClient();

  const products = await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID!,
  });

  return products.result.items;
}

/**
 * Retrieves all available discount codes for your Polar organization.
 */
export async function getPolarDiscounts() {
  const polar = getPolarClient();

  const discounts = await polar.discounts.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID!,
  });

  return discounts.result.items;
}

/**
 * Helper to map a product ID to a checkout-compatible format
 */
export function toCheckoutProducts(
  products: PolarProduct[],
): Array<{ productId: string; slug: string }> {
  return products.map((p) => ({
    productId: p.productId,
    slug: p.slug,
  }));
}
