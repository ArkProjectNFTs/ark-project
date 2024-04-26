"use client";

import React, { createContext, useMemo, type PropsWithChildren } from "react";

import { RpcProvider } from "starknet";

import { Config } from "@ark-project/core";

type RpcContextValue =
  | {
      rpcProvider: RpcProvider;
    }
  | undefined;

export type RpcProviderProviderProps = {
  config: Config;
};

export const RpcContext = createContext<RpcContextValue>(undefined);

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

  return <RpcContext.Provider value={arkChain}>{children}</RpcContext.Provider>;
}
