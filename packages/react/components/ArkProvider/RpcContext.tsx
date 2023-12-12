"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren
} from "react";

import { RpcProvider } from "starknet";

import { createAccount } from "@ark-project/core";

export enum Network {
  Mainnet,
  Testnet
}

const NETWORK_TO_RPC_NODE_URL: Record<Network, string> = {
  [Network.Mainnet]: "https://solis.arkproject.dev/",
  // [Network.Testnet]: "https://staging.solis.arkproject.dev/"
  [Network.Testnet]: "http://localhost:7777"
};

type RpcContextValue =
  | {
      rpcProvider: RpcProvider;
    }
  | undefined;

export type RpcProviderProviderProps = {
  network: Network;
};

const RpcContext = createContext<RpcContextValue>(undefined);

export function RpcProviderProvider(
  props: PropsWithChildren<RpcProviderProviderProps>
) {
  const { children, network } = props;

  const value = useMemo(
    () => ({
      rpcProvider: new RpcProvider({
        nodeUrl: NETWORK_TO_RPC_NODE_URL[network]
      })
    }),
    [network]
  );

  useEffect(() => {
    // If the burner account is not in the localstorage
    if (
      !localStorage.getItem("burner_address") &&
      !localStorage.getItem("burner_private_key") &&
      !localStorage.getItem("burner_public_key")
    ) {
      createAccount(value.rpcProvider).then(
        ({ address, privateKey, publicKey }) => {
          localStorage.setItem("burner_address", address);
          localStorage.setItem("burner_private_key", privateKey);
          localStorage.setItem("burner_public_key", publicKey);
        }
      );
    }
  }, [value]);

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}

export function useRpc() {
  const rpcContext = useContext(RpcContext);

  if (rpcContext === undefined) {
    throw new Error("useRpc must be used within an ArkProvider");
  }

  const { rpcProvider } = rpcContext;

  return { rpcProvider };
}
