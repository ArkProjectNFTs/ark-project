import { RpcProvider } from "starknet";

import { createConfig } from "@ark-project/core";

// Initialize the RPC provider with your StarkNet node URL
const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL ?? "localhost:5050"
});

// Create the Ark SDK configuration
// dev
export const config = createConfig({
  starknetNetwork: "dev",
  arkchainNetwork: "dev"
});

// custom
// export const config = createConfig({
//   starknetProvider: starknetProvider,
//   starknetNetwork: process.env.STARKNET_NETWORK_ID as Network,
//   arkchainNetwork: process.env.SOLIS_NETWORK_ID as Network,
//   arkchainRpcUrl: process.env.SOLIS_NODE_URL,
//   starknetCurrencyAddress: process.env.STARKNET_CURRENCY_ADDRESS,
//   arkchainAccountClassHash: process.env.SOLIS_ACCOUNT_CLASS_HASH
// });
