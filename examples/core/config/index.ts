import { createConfig, Network, starknetEthContract } from "@ark-project/core";

import contractsDev from "../../../contracts.dev.json";
import contractsProd from "../../../contracts.json";

// Only mainnet and dev are supported for now
const network = (process.env.STARKNET_NETWORK_ID || "dev") as Network;
const isDev = network === "dev";

export const contracts = isDev ? contractsDev : contractsProd.mainnet;
const starknetExecutorContract = isDev
  ? contractsDev.executor
  : contracts.executor;
const arkchainOrderbookContract = isDev
  ? contractsDev.orderbook
  : contracts.orderbook;
const starknetCurrencyContract = isDev ? contractsDev.eth : starknetEthContract;

export const nftContract = contracts.nftContract;

export const config = createConfig({
  starknetNetwork: network,
  starknetExecutorContract,
  starknetCurrencyContract,
  arkchainNetwork: network,
  arkchainOrderbookContract
});
