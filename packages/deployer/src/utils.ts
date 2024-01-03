import { promises as fs } from "fs";
import { join } from "path";

import { Account, RpcProvider } from "starknet";

import { getProvider } from "./providers";
import { ProviderNetwork } from "./types";

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
      address:
        process.env.STARKNET_ADMIN_ADDRESS_DEV ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_ADMIN_PUBLIC_KEY_DEV ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.STARKNET_ADMIN_ADDRESS_GOERLI ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_ADMIN_PRIVATE_KEY_GOERLI ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_ADMIN_PUBLIC_KEY_GOERLI ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.STARKNET_ADMIN_ADDRESS_MAINNET ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_ADMIN_PRIVATE_KEY_MAINNET ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_ADMIN_PUBLIC_KEY_MAINNET ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    }
  ];

  const starknetExecutorAccounts = [
    {
      address:
        process.env.STARKNET_EXECUTOR_ADDRESS_DEV ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_EXECUTOR_PRIVATE_KEY_DEV ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_EXECUTOR_PUBLIC_KEY_DEV ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.STARKNET_EXECUTOR_ADDRESS_GOERLI ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_EXECUTOR_PRIVATE_KEY_GOERLI ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_EXECUTOR_PUBLIC_KEY_GOERLI ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.STARKNET_EXECUTOR_ADDRESS_MAINNET ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_EXECUTOR_PRIVATE_KEY_MAINNET ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_EXECUTOR_PUBLIC_KEY_MAINNET ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    }
  ];

  const solisAdminAccounts = [
    {
      address:
        process.env.SOLIS_ADMIN_ADDRESS_DEV ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.SOLIS_ADMIN_PUBLIC_KEY_DEV ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.SOLIS_ADMIN_ADDRESS_GOERLI ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.SOLIS_ADMIN_PRIVATE_KEY_GOERLI ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.SOLIS_ADMIN_PUBLIC_KEY_GOERLI ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
    },
    {
      address:
        process.env.SOLIS_ADMIN_ADDRESS_MAINNET ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.SOLIS_ADMIN_PRIVATE_KEY_MAINNET ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.SOLIS_ADMIN_PUBLIC_KEY_MAINNET ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053"
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
    starknetExecutorAccounts,
    starknetNetwork,
    "STARKNET",
    "EXECUTOR"
  );
  const filteredSolisAccounts = filterAccounts(
    solisAdminAccounts,
    solisNetwork,
    "SOLIS",
    "ADMIN"
  );

  return {
    starknetAdminAccount: {
      executor: filteredStarknetExecutorAccounts,
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
