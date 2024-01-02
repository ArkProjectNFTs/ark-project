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

  const starknetAccounts = [
    {
      address:
        process.env.STARKNET_ACCOUNT1_ADDRESS ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_ACCOUNT1_PUBLIC_KEY ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
      deployed: true
    },
    {
      address:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
      privateKey:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
      publicKey:
        process.env.STARKNET_ACCOUNT1_PUBLIC_KEY ||
        "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
      deployed: true
    }
  ];

  const solisAccounts = [
    {
      address:
        process.env.SOLIS_ACCOUNT1_ADDRESS ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.SOLIS_ACCOUNT1_PRIVATE_KEY ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.SOLIS_ACCOUNT1_PUBLIC_KEY ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
      deployed: true
    },
    {
      address:
        process.env.SOLIS_ACCOUNT2_ADDRESS ||
        "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
      privateKey:
        process.env.SOLIS_ACCOUNT2_PRIVATE_KEY ||
        "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
      publicKey:
        process.env.SOLIS_ACCOUNT2_PUBLIC_KEY ||
        "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
      deployed: true
    }
  ];

  return {
    starknetAccounts: buildAccounts(starknetProvider, starknetAccounts),
    arkchainAccounts: buildAccounts(solisProvider, solisAccounts)
  };
}

function buildAccounts(provider: RpcProvider, accountData: any[]): Account[] {
  return accountData.map(({ address, privateKey }) => {
    return new Account(provider, address, privateKey);
  });
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
    console.error("Erreur lors de la lecture du fichier :", error);
    throw error;
  }
}
