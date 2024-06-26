import { getSolisProvider } from "../providers";
import { ProviderNetwork } from "../types";
import { buildAccounts, filterAccounts } from "./accounts";

import "dotenv/config";

export function getSolisAccounts(solisNetwork: ProviderNetwork) {
  const { provider: solisProvider } = getSolisProvider(solisNetwork);

  const solisAdminAccounts = [
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_DEV || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_DEV || ""
    },
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_SEPOLIA || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_SEPOLIA || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_SEPOLIA || ""
    },
    {
      address: process.env.SOLIS_ADMIN_ADDRESS_MAINNET || "",
      privateKey: process.env.SOLIS_ADMIN_PRIVATE_KEY_MAINNET || "",
      publicKey: process.env.SOLIS_ADMIN_PUBLIC_KEY_MAINNET || ""
    }
  ];

  const filteredSolisAccounts = filterAccounts(
    solisAdminAccounts,
    solisNetwork,
    "SOLIS",
    "ADMIN"
  );

  return {
    arkchainAdminAccount: buildAccounts(solisProvider, filteredSolisAccounts)
  };
}
