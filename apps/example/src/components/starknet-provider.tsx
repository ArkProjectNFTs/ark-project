"use client";

import { ReactNode } from "react";
import * as React from "react";

import { mainnet } from "@starknet-react/chains";
import {
  argent,
  braavos,
  jsonRpcProvider,
  StarknetConfig,
  useInjectedConnectors,
  voyager
} from "@starknet-react/core";

function rpc() {
  return {
    nodeUrl: `https://starknet-mainnet.public.blastapi.io/rpc/v0.5`
  };
}

export function StarknetProvider({ children }: { children: ReactNode }) {
  const provider = jsonRpcProvider({ rpc });
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "alphabetical"
  });

  return (
    <StarknetConfig
      chains={[mainnet]}
      provider={provider}
      connectors={connectors}
      explorer={voyager}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
