import fs from "fs";
import path from "path";

type ContractConfig = {
  [key: string]: {
    messaging?: string;
    executor?: string;
    nftContract?: string;
    eth?: string;
    orderbook?: string;
  };
};

// Function to read and parse JSON from a given path
const readJson = (filePath: string): ContractConfig => {
  const rawJson = fs.readFileSync(filePath, "utf8");
  return JSON.parse(rawJson);
};

// Function to construct contract address constants
const constructContractConstants = (
  contracts: ContractConfig,
  network: string,
  networkName: string
): string => {
  return `
export const STARKNET_ETH_ADDRESS_${networkName} = "${
    contracts[network]?.eth || ""
  }";
export const STARKNET_NFT_ADDRESS_${networkName} = "${
    contracts[network]?.nftContract || ""
  }";
export const STARKNET_EXECUTOR_ADDRESS_${networkName} = "${
    contracts[network]?.executor || ""
  }";
export const SOLIS_ORDER_BOOK_ADDRESS_${networkName} = "${
    contracts[network]?.orderbook || ""
  }";
  `.trim();
};

// Paths
const contractJsonPath = path.join(__dirname, "..", "../../contracts.json");
const contractsFilePath = path.join(
  __dirname,
  "..",
  "src/constants/contracts.ts"
);

// Read contract.json
const contracts = readJson(contractJsonPath);

// Networks
const networks = {
  testnet: "goerli", // TODO: change to sepolia
  mainnet: "mainnet",
  dev: "local"
};

// Construct contract address constants for each network
const contractConstants = Object.entries(networks)
  .map(([networkName, network]) =>
    constructContractConstants(contracts, network, networkName.toUpperCase())
  )
  .join("\n\n");

// Write to contracts file
fs.writeFileSync(contractsFilePath, contractConstants);
