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

export interface CreateConfigParameters {
  starknetNetwork?: Network;
  starknetRpcUrl?: string;
  starknetProvider?: ProviderInterface;
  starknetExecutorContract?: string;
  starknetCurrencyContract?: string;
  arkchainNetwork?: Network;
  arkchainRpcUrl?: string;
  arkProvider?: ProviderInterface;
  arkchainOrderbookContract?: string;
}

export function createConfig({
  starknetNetwork = networks.dev,
  starknetRpcUrl,
  starknetProvider,
  starknetExecutorContract,
  starknetCurrencyContract = starknetEthContract,
  arkchainNetwork = networks.dev,
  arkchainRpcUrl,
  arkProvider,
  arkchainOrderbookContract
}: CreateConfigParameters): Config {
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
