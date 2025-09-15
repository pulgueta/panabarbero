import { QueryProvider } from "@panabarbero/client/providers";
import { Geist, Geist_Mono } from "next/font/google";
import type { FC, PropsWithChildren } from "react";

import { generateSEO } from "@/lib/seo";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = generateSEO();

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
