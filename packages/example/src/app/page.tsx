"use client";

import { ArkProvider, Network } from "@ark-project/react";

import WalletBar from "@/components/WalletBar";

import Account from "./components/Account";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-12">
      <ArkProvider network={Network.Testnet}>
        <WalletBar />
        <Account />
      </ArkProvider>
    </main>
  );
}
