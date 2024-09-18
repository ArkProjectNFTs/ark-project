import { Account, type RpcProvider } from "starknet";

import type { ProviderNetwork } from "../types";

export const getNetworkVarName = (
  network: ProviderNetwork,
  type: string,
  accountType: string
): string => `${type}_${accountType}_ADDRESS_${network.toUpperCase()}`;

export const filterAccounts = (
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

export const buildAccounts = (
  provider: RpcProvider,
  accountData:
    | {
        address: string;
        privateKey: string;
        publicKey: string;
      }
    | undefined
): Account => {
  if (!accountData) {
    throw new Error("No account found");
  }
  return new Account(
    provider,
    accountData.address,
    accountData.privateKey,
    "1"
  );
};
