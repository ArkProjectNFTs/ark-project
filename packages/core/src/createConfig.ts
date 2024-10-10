import { RpcProvider, type ProviderInterface } from "starknet";

import {
  networks,
  starknetEthContract,
  starknetExecutorContracts,
  starknetRpcUrls
} from "./constants.js";
import { MissingExecutorContractError } from "./errors/config.js";

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

const docsPath = "/sdk-core/configuration";
const docsSlug = "starknetExecutorContract";
export function createConfig({
  starknetNetwork,
  starknetRpcUrl,
  starknetProvider,
  starknetExecutorContract,
  starknetCurrencyContract = starknetEthContract
}: CreateConfigParameters): Config {
  if (starknetNetwork === networks.dev && !starknetExecutorContract) {
    throw new MissingExecutorContractError({ docsPath, docsSlug });
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
