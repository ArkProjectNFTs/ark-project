"use client";

import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useState
} from "react";

import { useAccount, useNetwork, useProvider } from "@starknet-react/core";

import { Config, createConfig, Network } from "@ark-project/core";

import { getOwner } from "../../lib/getOwner";
import { RpcProviderProvider } from "./RpcContext";

const OwnerDataContext = createContext<string | undefined>(undefined);
const ConfigDataContext = createContext<Config | undefined>(undefined);

export type ArkProviderProviderProps = {
  config: Partial<Config>;
};

function ArkProvider(props: PropsWithChildren<ArkProviderProviderProps>) {
  const { children, config: baseConfig } = props;
  const [owner, setOwner] = useState<string | undefined>(undefined);
  const { provider: starknetProvider } = useProvider();
  const { chain: starknetChain } = useNetwork();
  const [config, setConfig] = useState<Config>(
    createConfig({
      starknetProvider: starknetProvider,
      starknetNetwork: starknetChain.network as Network,
      arkchainNetwork: baseConfig.arkchainNetwork
    })
  );

  useEffect(() => {
    const newConfig = createConfig({
      starknetProvider: starknetProvider,
      starknetNetwork: starknetChain.network as Network,
      arkchainNetwork: baseConfig.arkchainNetwork
    });
    setConfig(newConfig);
  }, [starknetProvider, starknetChain, baseConfig]);

  const { address, connector } = useAccount();

  useEffect(() => {
    const fetchOwner = async () => {
      if (address && config.starknetProvider && connector?.id) {
        const owner = await getOwner(
          address,
          config.starknetProvider,
          connector?.id
        );
        if (Array.isArray(owner) && owner[0]) {
          setOwner(owner[0]);
        }
      } else {
        setOwner(undefined);
      }
    };
    fetchOwner();
  }, [address, config.starknetProvider, connector]);

  return (
    <ConfigDataContext.Provider value={config}>
      <OwnerDataContext.Provider value={owner}>
        <RpcProviderProvider config={config}>{children}</RpcProviderProvider>
      </OwnerDataContext.Provider>
    </ConfigDataContext.Provider>
  );
}

export { ArkProvider, OwnerDataContext, ConfigDataContext };
