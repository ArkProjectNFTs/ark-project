import { RpcProvider, type ProviderInterface } from "starknet";

import {
  networks,
  starknetEthContract,
  starknetExecutorContracts,
  starknetRpcUrls
} from "./constants.js";

export type Network = "mainnet" | "sepolia" | "dev";

export interface Config {
  starknetNetwork: Network;
  starknetProvider: ProviderInterface;
  starknetRpcUrl: string;
  starknetExecutorContract: string;
  starknetCurrencyContract: string;
}

export type CreateConfigParameters = {
  starknetNetwork: Network;
  starknetRpcUrl?: string;
  starknetProvider?: ProviderInterface;
  starknetExecutorContract?: string;
  starknetCurrencyContract?: string;
};

export function createConfig({
  starknetNetwork,
  starknetRpcUrl,
  starknetProvider,
  starknetExecutorContract,
  starknetCurrencyContract = starknetEthContract
}: CreateConfigParameters): Config {
  if (starknetNetwork === networks.dev && !starknetExecutorContract) {
    throw new Error("starknetExecutorContract is required for dev network");
  }

  return {
    starknetNetwork,
    starknetRpcUrl: starknetRpcUrl || starknetRpcUrls[starknetNetwork],
    starknetProvider:
      starknetProvider ||
      new RpcProvider({
        nodeUrl: starknetRpcUrl || starknetRpcUrls[starknetNetwork]
      }),
    starknetExecutorContract:
      starknetExecutorContract || starknetExecutorContracts[starknetNetwork],
    starknetCurrencyContract
  };
}
