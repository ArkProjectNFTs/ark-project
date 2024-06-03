import { RpcProvider, type ProviderInterface } from "starknet";

import {
  arkchainOrderbookContracts,
  arkchainRpcUrls,
  networks,
  starknetEthContract,
  starknetExecutorContracts,
  starknetRpcUrls
} from "./constants.js";

export type Network = "mainnet" | "goerli" | "sepolia" | "dev";

export interface Config {
  starknetNetwork: Network;
  starknetProvider: ProviderInterface;
  starknetRpcUrl: string;
  starknetExecutorContract: string;
  starknetCurrencyContract: string;
  arkchainNetwork: Network;
  arkProvider: ProviderInterface;
  arkchainRpcUrl: string;
  arkchainOrderbookContract: string;
}

export type CreateConfigParameters = {
  starknetNetwork: Network;
  starknetRpcUrl?: string;
  starknetProvider?: ProviderInterface;
  starknetExecutorContract?: string;
  starknetCurrencyContract?: string;
  arkchainNetwork: Network;
  arkchainRpcUrl?: string;
  arkProvider?: ProviderInterface;
  arkchainOrderbookContract?: string;
};

export function createConfig({
  starknetNetwork,
  starknetRpcUrl,
  starknetProvider,
  starknetExecutorContract,
  starknetCurrencyContract = starknetEthContract,
  arkchainNetwork,
  arkchainRpcUrl,
  arkProvider,
  arkchainOrderbookContract
}: CreateConfigParameters): Config {
  if (starknetNetwork === networks.dev && !starknetExecutorContract) {
    throw new Error("starknetExecutorContract is required for dev network");
  }

  if (arkchainNetwork === networks.dev && !arkchainOrderbookContract) {
    throw new Error("arkchainOrderbookContract is required for dev network");
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
    starknetCurrencyContract,
    arkchainNetwork,
    arkchainRpcUrl: arkchainRpcUrl || arkchainRpcUrls[arkchainNetwork],
    arkProvider:
      arkProvider ||
      new RpcProvider({
        nodeUrl: arkchainRpcUrl || arkchainRpcUrls[arkchainNetwork]
      }),
    arkchainOrderbookContract:
      arkchainOrderbookContract || arkchainOrderbookContracts[arkchainNetwork]
  };
}
