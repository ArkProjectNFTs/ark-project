import fs from "fs";
import path from "path";

import "dotenv/config";

type ContractConfig = {
  [key: string]: {
    messaging?: string;
    executor?: string;
    nftContract?: string;
    eth?: string;
    orderbook?: string;
  };
};

// Read contract.json
const contractJsonPath = path.join(__dirname, "..", "../../../contracts.json");
const contractJson = fs.readFileSync(contractJsonPath, "utf8");
const contracts: ContractConfig = JSON.parse(contractJson);

// Get the current networks from environment variables
const starknetNetwork = (process.env.STARKNET_NETWORK_ID ||
  "dev") as keyof ContractConfig;

// constants for examples
export const STARKNET_ETH_ADDRESS =
  contracts[starknetNetwork]?.eth ||
  "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const STARKNET_NFT_ADDRESS =
  contracts[starknetNetwork]?.nftContract || "";
