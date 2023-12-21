import { promises as fs } from "fs";
import { join } from "path";

import { Account } from "starknet";

import { getProvider } from "./providers";
import { ProviderNetwork } from "./types";

export function getContractsFilePath() {
  return join(__dirname, `../../../contracts.json`);
}

export async function getExistingAccounts(
  network: ProviderNetwork
): Promise<Account[]> {
  const provider = getProvider(network);
  const filePath = join(__dirname, `../accounts/${network}.json`);

  let accountRows: any[] = [];
  try {
    const fileData = await fs.readFile(filePath, "utf8");
    accountRows = JSON.parse(fileData);
  } catch (error) {
    console.error(error);
  }

  let accounts: Account[] = [];
  for (const { address, privateKey } of accountRows) {
    const account = new Account(provider, address, privateKey);
    accounts.push(account);
  }
  return accounts;
}

export async function getExistingContracts() {
  try {
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const jsonContent = JSON.parse(fileContent);
    return jsonContent;
  } catch (error) {
    console.error("Erreur lors de la lecture du fichier :", error);
    throw error;
  }
}
