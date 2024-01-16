"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren
} from "react";

import { RpcProvider } from "starknet";

import { Config, createAccount } from "@ark-project/core";

type RpcContextValue =
  | {
      rpcProvider: RpcProvider;
    }
  | undefined;

export type RpcProviderProviderProps = {
  config: Config;
};

const RpcContext = createContext<RpcContextValue>(undefined);

export function RpcProviderProvider(
  props: PropsWithChildren<RpcProviderProviderProps>
) {
  const { children, config } = props;

  const arkChain = useMemo(
    () => ({
      rpcProvider: new RpcProvider({
        nodeUrl: config.arkchainRpcUrl
      })
    }),
    [config.arkchainRpcUrl]
  );

  useEffect(() => {
    // If the burner account is not in the localstorage
    if (
      !localStorage.getItem("burner_address") &&
      !localStorage.getItem("burner_private_key") &&
      !localStorage.getItem("burner_public_key")
    ) {
      console.log("Creating burner account");
      createAccount(arkChain.rpcProvider).then(
        ({ address, privateKey, publicKey }) => {
          console.log("Burner account created");
          console.log("Address: ", address);
          console.log("Private key: ", privateKey);
          console.log("Public key: ", publicKey);
          localStorage.setItem("burner_address", address);
          localStorage.setItem("burner_private_key", privateKey);
          localStorage.setItem("burner_public_key", publicKey);
        }
      );
    }
  }, [arkChain]);

  return <RpcContext.Provider value={arkChain}>{children}</RpcContext.Provider>;
}

export function useRpc() {
  const rpcContext = useContext(RpcContext);

  if (rpcContext === undefined) {
    throw new Error("useRpc must be used within an ArkProvider");
  }

  const { rpcProvider } = rpcContext;

  return { rpcProvider };
}
