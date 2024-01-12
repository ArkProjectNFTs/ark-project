import { RpcProvider } from "starknet";

import {
  DEV_CONTRACTS,
  GOERLI_CONTRACTS,
  MAINNET_CONTRACTS,
  SEPOLIA_CONTRACTS
} from "./contracts";

export type Network = "mainnet" | "goerli" | "sepolia" | "dev";

const defaultCurrencyAddress =
  "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const defaultAccountClassHash =
  "0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";

const defaultExecutorAddress = "";

export interface Config {
  starknetNetwork?: Network;
  arkchainNetwork?: Network;
  arkchainRpcUrl?: string;
  starknetCurrencyAddress?: string;
  arkchainAccountClassHash?: string;
  arkProvider: RpcProvider;
  starknetProvider: RpcProvider;
  arkExecutorAddress?: string;
  starknetContracts: StarknetContract;
  arkchainContracts: ArkchainContract;
}

interface ArkchainContract {
  orderbook: string;
}

interface StarknetContract {
  eth: string;
  messaging: string;
  executor: string;
  nftContract: string;
}

const getArkchainRpcUrl = (network: Network): string => {
  switch (network) {
    case "dev":
      return "http://0.0.0.0:7777";
    case "goerli":
      return "https://staging.solis.arkproject.dev";
    case "sepolia":
      return "https://sepolia.solis.arkproject.dev";
    case "mainnet":
      return "https://solis.arkproject.dev";
    default:
      return "http://default-arkchain-rpc-url.com";
  }
};

export const createConfig = (userConfig: Partial<Config>): Config => {
  if (!userConfig.starknetProvider) {
    throw new Error("A starknetProvider must be provided");
  }

  const contracts = {
    goerli: GOERLI_CONTRACTS,
    sepolia: SEPOLIA_CONTRACTS,
    mainnet: MAINNET_CONTRACTS,
    dev: DEV_CONTRACTS
  };

  const selectedStarknetContracts = contracts[
    userConfig.starknetNetwork || "dev"
  ] as StarknetContract;
  const selectedArkchainContracts = contracts[
    userConfig.arkchainNetwork || "dev"
  ] as ArkchainContract;

  const arkchainContracts: ArkchainContract = {
    orderbook: selectedArkchainContracts.orderbook
  };

  const arkchainRpcUrl =
    userConfig.arkchainRpcUrl ||
    getArkchainRpcUrl(userConfig.arkchainNetwork || "dev");
  const config: Config = {
    starknetProvider: userConfig.starknetProvider,
    starknetNetwork: userConfig.starknetNetwork || "dev",
    arkchainNetwork: userConfig.arkchainNetwork || "dev",
    arkchainRpcUrl: arkchainRpcUrl,
    starknetCurrencyAddress:
      userConfig.starknetCurrencyAddress || defaultCurrencyAddress,
    arkchainAccountClassHash:
      userConfig.arkchainAccountClassHash || defaultAccountClassHash,
    arkExecutorAddress: userConfig.arkExecutorAddress || defaultExecutorAddress,
    arkProvider:
      userConfig.arkProvider ||
      new RpcProvider({
        nodeUrl: arkchainRpcUrl
      }),
    starknetContracts: selectedStarknetContracts,
    arkchainContracts: arkchainContracts
  };

  return config;
};
