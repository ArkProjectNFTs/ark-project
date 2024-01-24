"use client";

import { useMemo } from "react";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import Image from "next/image";

import { Button } from "@/components/ui/Button";

function ConnectWallet() {
  const { connectors, connect } = useConnect();

  return (
    <div className="inline-flex flex-row gap-2">
      {connectors.map((connector) => {
        return (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="gap-x-2 mr-2"
          >
            {connector.id}
          </Button>
        );
      })}
    </div>
  );
}

export function UserNav() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const shortenedAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  return address ? (
    <div>
      <div className="flex items-center space-x-4">
        <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full">
          <Image
            className="aspect-square h-full w-full"
            src="/01.png"
            width={36}
            height={36}
            alt="avatar"
          />
        </span>
        <div>
          <p className="text-sm font-medium leading-none">Sofia Davis</p>
          <p className="text-sm text-muted-foreground">{shortenedAddress}</p>
        </div>
        <Button onClick={() => disconnect()} className="gap-x-2 mr-2">
          Logout
        </Button>
      </div>
    </div>
  ) : (
    <ConnectWallet />
  );
}
