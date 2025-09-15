import type { NextConfig } from "next";

const nextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  transpilePackages: [
    "@panabarbero/client",
    "@panabarbero/auth",
    "@panabarbero/api",
  ],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
} satisfies NextConfig;

export default nextConfig;
