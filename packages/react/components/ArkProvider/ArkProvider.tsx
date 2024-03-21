"use client";

import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useState
} from "react";

import { useAccount, useNetwork, useProvider } from "@starknet-react/core";

import {
  Config,
  ConfigParameters,
  createConfig,
  Network
} from "@ark-project/core";

import { getOwner } from "../../lib/getOwner";
import { RpcProviderProvider } from "./RpcContext";

const OwnerDataContext = createContext<string | undefined>(undefined);
const ConfigDataContext = createContext<Config | undefined>(undefined);

export type ArkProviderProviderProps = {
  config: ConfigParameters;
};

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

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
  if (starknetChain.network !== "mainnet") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen space-y-4">
        <div className="flex items-center justify-center rounded-full p-3 bg-red-50">
          <AlertCircleIcon className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter">Wrong Network</h1>
        <p className="mx-auto max-w-[600px] text-center text-gray-500 md:text-xl/relaxed dark:text-gray-400">
          Please switch to the <b>mainnet</b> network in your connected wallet.
        </p>
      </div>
    );
  }

  return (
    <ConfigDataContext.Provider value={config}>
      <OwnerDataContext.Provider value={owner}>
        <RpcProviderProvider config={config}>{children}</RpcProviderProvider>
      </OwnerDataContext.Provider>
    </ConfigDataContext.Provider>
  );
}

export { ArkProvider, OwnerDataContext, ConfigDataContext };
