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
const solisNetwork = (process.env.SOLIS_NETWORK_ID ||
  "dev") as keyof ContractConfig;

// Assign constants based on the current networks
export const STARKNET_ETH_ADDRESS =
  contracts[starknetNetwork]?.eth ||
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const STARKNET_NFT_ADDRESS =
  contracts[starknetNetwork]?.nftContract || "";
export const STARKNET_EXECUTOR_ADDRESS =
  contracts[starknetNetwork]?.executor || "";

export const SOLIS_ORDER_BOOK_ADDRESS =
  contracts[solisNetwork]?.orderbook || "";
// Add other Solis constants as needed

export const SOLIS_ACCOUNT_CLASS_HASH =
  "0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";
