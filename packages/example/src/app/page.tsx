"use client";

import { useAccount } from "@starknet-react/core";

import { ArkProvider, type Network } from "@ark-project/react";

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";

import Authentification from "./components/Authentification";
import OrderBookActions from "./components/OrderBookActions";

export default function Home() {
  const { account } = useAccount();
  if (account === undefined) return <Authentification />;
  return (
    <>
      <ArkProvider network={"dev" as Network}>
        <div className="hidden flex-col md:flex">
          <div className="border-b">
            <div className="container mx-auto">
              <div className="flex h-16 items-center">
                <MainNav />
                <div className="ml-auto flex items-center space-x-4">
                  <UserNav />
                </div>
              </div>
            </div>
          </div>
          <div className="container mx-auto flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                SDK Examples
              </h2>
            </div>
            <OrderBookActions />
          </div>
        </div>
      </ArkProvider>
    </>
  );
}
