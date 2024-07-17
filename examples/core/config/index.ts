import { createConfig, Network, starknetEthContract } from "@ark-project/core";

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

interface DeployedContracts {
  sepolia: BaseContracts;
  mainnet: BaseContracts;
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

// Assert the types of imported contracts
const typedContractsDev = contractsDev as DevContracts;
const typedContractsDeployed = contractsDeployed as DeployedContracts;

// Get the network from environment variable, defaulting to "dev"
export const network = (process.env.STARKNET_NETWORK_ID || "dev") as Network;

// Determine if we're in development mode
export const isDev = network === "dev";

// Function to get the correct contract configuration based on the network
function getContractConfig(network: Network): BaseContracts | DevContracts {
  switch (network) {
    case "dev":
      return typedContractsDev;
    case "sepolia":
      return typedContractsDeployed.sepolia;
    case "mainnet":
      return typedContractsDeployed.mainnet;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

// Get the contract configuration
export const contracts = getContractConfig(network);

// Export specific contract addresses
export const starknetExecutorContract = contracts.executor;
export const arkchainOrderbookContract = contracts.orderbook;
export const starknetCurrencyContract =
  isDev && isDevContracts(contracts) ? contracts.eth : starknetEthContract;

// Export NFT contract addresses only if they exist
export const nftContract = isDevContracts(contracts)
  ? contracts.nftContract
  : undefined;
export const nftContractFixedFees = isDevContracts(contracts)
  ? contracts.nftContractFixedFees
  : undefined;
export const nftContractRoyalties = isDevContracts(contracts)
  ? contracts.nftContractRoyalties
  : undefined;

export const config = createConfig({
  starknetNetwork: network,
  starknetExecutorContract,
  starknetCurrencyContract,
  arkchainNetwork: network,
  arkchainOrderbookContract
});
