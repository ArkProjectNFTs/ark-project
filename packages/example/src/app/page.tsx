"use client";

import { ArkProvider, Network } from "@ark-project/react";

import WalletBar from "@/components/WalletBar";

import OrderBookActions from "./components/OrderBookActions";

export default function Home() {
  return (
    <main className="flex flex-col items-center min-h-screen gap-12 max-w-5xl px-2 mx-auto mt-16">
      <ArkProvider network={Network.Testnet}>
        <WalletBar />
        <OrderBookActions />
      </ArkProvider>
    </main>
  );
}
