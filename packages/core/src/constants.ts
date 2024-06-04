import { MAINNET_CONTRACTS } from "./contracts.js";

export const networks = {
  mainnet: "mainnet",
  sepolia: "sepolia",
  dev: "dev"
} as const;

export const arkchainRpcUrls = {
  mainnet: "https://production.solis.arkproject.dev",
  sepolia: "https://sepolia.solis.arkproject.dev",
  dev: "http://0.0.0.0:7777"
};

export const starknetRpcUrls = {
  mainnet: "https://starknet-mainnet.public.blastapi.io/rpc/v0_6",
  sepolia: "https://starknet-sepolia.public.blastapi.io/rpc/v0_6",
  dev: "http://0.0.0.0:5050"
};

export const starknetExecutorContracts = {
  mainnet: MAINNET_CONTRACTS.executor,
  sepolia: "",
  dev: ""
};

export const starknetEthContract =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export const arkchainOrderbookContracts = {
  mainnet: MAINNET_CONTRACTS.orderbook,
  sepolia: "",
  dev: ""
};

export const SOLIS_ACCOUNT_CLASS_HASH =
  "0x05400e90f7e0ae78bd02c77cd75527280470e2fe19c54970dd79dc37a9d3645c";
