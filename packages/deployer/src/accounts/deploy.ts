import { promises as fs } from "fs";
import { join } from "path";

import { program } from "commander";
import { Account, CallData } from "starknet";

import "dotenv/config";

import { getStarknetProvider } from "../providers";
import { OZaccountClassHash } from "./constants";

interface Iaccount {
  address: string;
  privateKey: string;
  publicKey: string;
  deployed: boolean;
}

async function deployAccount(starknetNetwork: string) {
  const { provider: starknetProvider, nodeUrl } =
    getStarknetProvider(starknetNetwork);
  console.log("Using StarkNet provider:", nodeUrl);
  const accountsFilePath = join(
    __dirname,
    `../../accounts/${starknetNetwork}.json`
  );
  let accounts: Iaccount[] = [];
  try {
    const fileData = await fs.readFile(accountsFilePath, "utf8");
    accounts = JSON.parse(fileData);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return;
  }

  const notDeployedAccounts = accounts.filter((a) => a.deployed === false);

  for (const accountToDeploy of notDeployedAccounts) {
    const account = new Account(
      starknetProvider,
      accountToDeploy.address,
      accountToDeploy.privateKey,
      "1"
    );
    const { transaction_hash } = await account.deployAccount({
      classHash: OZaccountClassHash,
      constructorCalldata: CallData.compile({
        publicKey: accountToDeploy.publicKey
      }),
      addressSalt: accountToDeploy.publicKey
    });

    console.log("Deploying account... Transaction hash:", transaction_hash);
    // await starknetProvider.waitForTransaction(transaction_hash);

    console.log("✅ Account deployed.");

    const accountIndex = accounts.findIndex(
      (a) => a.address === accountToDeploy.address
    );
    if (accountIndex !== -1) {
      const accountToUpdate = accounts[accountIndex];
      if (accountToUpdate) {
        accountToUpdate.deployed = true;
      }
    }
  }

  try {
    await fs.writeFile(accountsFilePath, JSON.stringify(accounts, null, 2));
    console.log("Account information updated in JSON file.");
  } catch (error) {
    console.error("Error writing to JSON file:", error);
  }
}

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;

deployAccount(starknetNetwork);
