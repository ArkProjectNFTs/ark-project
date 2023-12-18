import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";

import { StarknetProvider } from "@/components/starknet-provider";

import "./globals.css";

import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app"
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
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <StarknetProvider>{children}</StarknetProvider>
      </body>
    </html>
  );
}