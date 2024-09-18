import {
  type Network,
  createConfig,
  starknetEthContract
} from "@ark-project/core";

import contractsDev from "../../../contracts.dev.json";
import contractsDeployed from "../../../contracts.json";

// Define types for contract configurations
interface BaseContracts {
  messaging: string;
  executor: string;
  orderbook: string;
}

interface DevContracts extends BaseContracts {
  nftContract: string;
  nftContractFixedFees: string;
  nftContractRoyalties: string;
  eth: string;
}

// interface DeployedContracts extends BaseContracts {
//   nftContract: string;
//   nftContractFixedFees: string;
//   nftContractRoyalties: string;
// }

interface DeployedContracts {
  sepolia: DeployedContracts;
  mainnet: DeployedContracts;
}

// Type guard to check if contracts object has NFT-related properties
function isDevContracts(
  contracts: BaseContracts | DevContracts
): contracts is DevContracts {
  return (
    "nftContract" in contracts &&
    "nftContractFixedFees" in contracts &&
    "nftContractRoyalties" in contracts &&
    "eth" in contracts
  );
}

// Verification function
function verifyContractAddress(
  address: string | undefined,
  name: string
): string {
  if (typeof address !== "string" || address.trim() === "") {
    throw new Error(`${name} contract address must be a non-empty string`);
  }
  return address;
}

// Assert the types of imported contracts
const typedContractsDev = contractsDev as DevContracts;
const typedContractsDeployed = contractsDeployed as DeployedContracts;

// Get the network from environment variable, defaulting to "dev"
export const network = (process.env.STARKNET_NETWORK_ID || "dev") as Network;

// Determine if we're in development mode
export const isDev = network === "dev";

// Function to get the correct contract configuration based on the network
function getContractConfig(network: Network): DevContracts | DeployedContracts {
  switch (network) {
    case "dev":
      return typedContractsDev;
    case "sepolia":
      return {
        ...typedContractsDeployed.sepolia,
        nftContract: process.env.NFT_CONTRACT_ADDRESS as string,
        nftContractFixedFees: process.env
          .NFT_CONTRACT_FIXED_FEES_ADDRESS as string,
        nftContractRoyalties: process.env
          .NFT_CONTRACT_ROYALTIES_ADDRESS as string
      };
    case "mainnet":
      return {
        ...typedContractsDeployed.mainnet,
        nftContract: process.env.NFT_CONTRACT_ADDRESS as string,
        nftContractFixedFees: process.env
          .NFT_CONTRACT_FIXED_FEES_ADDRESS as string,
        nftContractRoyalties: process.env
          .NFT_CONTRACT_ROYALTIES_ADDRESS as string
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

// Get the contract configuration
export const contracts = getContractConfig(network);

// Export verified specific contract addresses
export const starknetExecutorContract = verifyContractAddress(
  contracts.executor,
  "Executor"
);
export const starknetCurrencyContract = verifyContractAddress(
  isDev && isDevContracts(contracts) ? contracts.eth : starknetEthContract,
  "Currency"
);

// Export verified NFT contract addresses only if they exist or use environment variables
export const nftContract = isDevContracts(contracts)
  ? verifyContractAddress(contracts.nftContract, "NFT")
  : (process.env.NFT_CONTRACT_ADDRESS as string);
export const nftContractFixedFees = isDevContracts(contracts)
  ? verifyContractAddress(contracts.nftContractFixedFees, "NFT Fixed Fees")
  : (process.env.NFT_CONTRACT_FIXED_FEES_ADDRESS as string);
export const nftContractRoyalties = isDevContracts(contracts)
  ? verifyContractAddress(contracts.nftContractRoyalties, "NFT Royalties")
  : process.env.NFT_CONTRACT_ROYALTIES_ADDRESS;

export const config = createConfig({
  starknetNetwork: network,
  starknetExecutorContract,
  starknetCurrencyContract
});
