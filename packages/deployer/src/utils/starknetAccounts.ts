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
    },
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_SEPOLIA || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_SEPOLIA || "",
    },
    {
      address: process.env.STARKNET_ADMIN_ADDRESS_MAINNET || "",
      privateKey: process.env.STARKNET_ADMIN_PRIVATE_KEY_MAINNET || "",
    }
  ];

  const filteredStarknetAccounts = filterAccounts(
    starknetAdminAccounts,
    starknetNetwork,
    "STARKNET",
    "ADMIN"
  );

  return {
    starknetAdminAccount: buildAccounts(
      starknetProvider,
      filteredStarknetAccounts
    )
  };
}
