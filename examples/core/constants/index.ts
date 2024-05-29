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
const contractJsonPath = path.join(__dirname, "..", "../../contracts.json");
const contractJson = fs.readFileSync(contractJsonPath, "utf8");
const contracts: ContractConfig = JSON.parse(contractJson);

// Get the current networks from environment variables
const starknetNetwork = (process.env.STARKNET_NETWORK_ID ||
  "dev") as keyof ContractConfig;

// constants for examples
export const STARKNET_NFT_ADDRESS =
  contracts[starknetNetwork]?.nftContract || "";

export const STARKNET_EXECUTOR_ADDRESS =
  contracts[starknetNetwork]?.executor || "";
