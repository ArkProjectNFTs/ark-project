"use client";

import React, { createContext, PropsWithChildren, useMemo } from "react";

import { useNetwork, useProvider } from "@starknet-react/core";

import {
  Config,
  createConfig,
  CreateConfigParameters
} from "@ark-project/core";

const ArkContext = createContext<Config | undefined>(undefined);

export type ArkProviderProviderProps = {
  config: CreateConfigParameters;
};

function ArkProvider(props: PropsWithChildren<ArkProviderProviderProps>) {
  const { children, config: baseConfig } = props;
  const { provider } = useProvider();
  const { chain } = useNetwork();

  const config = useMemo(
    () =>
      createConfig({
        ...baseConfig,
        starknetProvider: provider,
        starknetNetwork: baseConfig.starknetNetwork
      }),
    [chain, provider, baseConfig.starknetNetwork]
  );

  return <ArkContext.Provider value={config}>{children}</ArkContext.Provider>;
}

export { ArkContext, ArkProvider };
