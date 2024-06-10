import { getStarknetProvider } from "../providers";
import { ProviderNetwork } from "../types";
import { buildAccounts, filterAccounts } from "./accounts";

import "dotenv/config";

export function getStarknetAccounts(starknetNetwork: ProviderNetwork) {
  const { provider: starknetProvider } = getStarknetProvider(starknetNetwork);

  const starknetAdminAccounts = [
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_DEV || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV || "",
      publicKey: process.env.STARKNET_ADMIN_PUBLIC_KEY_DEV || ""
    },
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_SEPOLIA || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_SEPOLIA || "",
      publicKey: process.env.STARKNET_ADMIN_PUBLIC_KEY_SEPOLIA || ""
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
      address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_SEPOLIA || "",
      privateKey: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_SEPOLIA || "",
      publicKey: process.env.STARKNET_SOLIS_ACCOUNT_PUBLIC_KEY_SEPOLIA || ""
    },
    {
      address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_MAINNET || "",
      privateKey: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_MAINNET || "",
      publicKey: process.env.STARKNET_SOLIS_ACCOUNT_PUBLIC_KEY_MAINNET || ""
    }
  ];

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

  return {
    starknetSolisAccount: filteredStarknetExecutorAccounts,
    starknetAdminAccount: buildAccounts(
      starknetProvider,
      filteredStarknetAccounts
    )
  };
}
