import { promises as fs } from "fs";
import { join } from "path";

import { Account, RpcProvider } from "starknet";

import { getProvider } from "./providers";
import { ProviderNetwork } from "./types";

import "dotenv/config";

export function getExistingAccounts(
  starknetNetwork: ProviderNetwork,
  solisNetwork: ProviderNetwork
) {
  const { solisProvider, starknetProvider } = getProvider(
    starknetNetwork,
    solisNetwork
  );

  // Define a function to get the network-specific address variable name
  const getNetworkVarName = (
    network: ProviderNetwork,
    type: String,
    accountType: string
  ): string => `${type}_${accountType}_ADDRESS_${network.toUpperCase()}`;

  // Define a function to filter accounts based on the network
  const filterAccounts = (
    accounts: { address: string; privateKey: string; publicKey: string }[],
    network: ProviderNetwork,
    type: string,
    accountType: string
  ): { address: string; privateKey: string; publicKey: string } | undefined => {
    return accounts.find((account) => {
      const envVarName = getNetworkVarName(network, type, accountType);
      const envAddress = process.env[envVarName];
      return account.address === envAddress || network === "dev";
    });
  };

  const starknetAdminAccounts = [
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_DEV || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV || "",
      publicKey: process.env.STARKNET_ADMIN_PUBLIC_KEY_DEV || ""
    },
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_GOERLI || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_GOERLI || "",
      publicKey: process.env.STARKNET_ADMIN_PUBLIC_KEY_GOERLI || ""
    },
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_MAINNET || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_MAINNET || "",
      publicKey: process.env.STARKNET_ADMIN_PUBLIC_KEY_MAINNET || ""
    }
  ];

  const starknetAppchainAccounts = [
    {
      address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV || "",
      privateKey: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_DEV || "",
      publicKey: process.env.STARKNET_SOLIS_ACCOUNT_PUBLIC_KEY_DEV || ""
    },
    {
      address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_GOERLI || "",
      privateKey: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_GOERLI || "",
      publicKey: process.env.STARKNET_SOLIS_ACCOUNT_PUBLIC_KEY_GOERLI || ""
    },
    {
      address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_MAINNET || "",
      privateKey: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_MAINNET || "",
      publicKey: process.env.STARKNET_SOLIS_ACCOUNT_PUBLIC_KEY_MAINNET || ""
    }
  ];

  const solisAdminAccounts = [
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_DEV || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_DEV || ""
    },
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_GOERLI || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_GOERLI || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_GOERLI || ""
    },
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_MAINNET || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_MAINNET || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_MAINNET || ""
    }
  ];

  // Filter the accounts based on the provided network
  const filteredStarknetAccounts = filterAccounts(
    starknetAdminAccounts,
    starknetNetwork,
    "STARKNET",
    "ADMIN"
  );
  const filteredStarknetExecutorAccounts = filterAccounts(
    starknetAppchainAccounts,
    starknetNetwork,
    "STARKNET",
    "SOLIS_ACCOUNT"
  );
  const filteredSolisAccounts = filterAccounts(
    solisAdminAccounts,
    solisNetwork,
    "SOLIS",
    "ADMIN"
  );

  return {
    starknetAdminAccount: {
      appchain_account: filteredStarknetExecutorAccounts,
      account: buildAccounts(starknetProvider, filteredStarknetAccounts)
    },
    arkchainAdminAccount: {
      account: buildAccounts(solisProvider, filteredSolisAccounts)
    }
  };
}

function buildAccounts(
  provider: RpcProvider,
  accountData:
    | {
        address: string;
        privateKey: string;
        publicKey: string;
      }
    | undefined
): Account {
  if (!accountData) {
    throw new Error("No account found");
  }
  return new Account(provider, accountData.address, accountData.privateKey);
}

export function getContractsFilePath() {
  return join(__dirname, `../../../contracts.json`);
}

export async function getExistingContracts() {
  try {
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const jsonContent = JSON.parse(fileContent);
    return jsonContent;
  } catch (error) {
    console.error("Error while reading file :", error);
    throw error;
  }
}
