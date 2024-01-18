import React from "react";

import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";

import { Network } from "@ark-project/core";
import { ArkProvider } from "@ark-project/react";

import { StarknetProvider } from "@/components/starknet-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ark Project",
  description: "Ark Project SDK Examples"
};

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const config = {
    arkchainNetwork: "dev" as Network
  };
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <StarknetProvider>
          <ArkProvider config={config}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </ArkProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
