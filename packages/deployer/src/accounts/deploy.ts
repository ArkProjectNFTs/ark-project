import { promises as fs } from "fs";
import { join } from "path";

import { program } from "commander";
import { Account, CallData } from "starknet";

import "dotenv/config";

import { getStarknetProvider } from "../providers";
import { OZaccountClassHash } from "./constants";

async function deployAccount(starknetNetwork: string) {
  const starknetProvider = getStarknetProvider(starknetNetwork);
  console.log("Using StarkNet provider:", starknetProvider.nodeUrl);
  const accountsFilePath = join(
    __dirname,
    `../../accounts/${starknetNetwork}.json`
  );
  let accounts: any[] = [];
  try {
    const fileData = await fs.readFile(accountsFilePath, "utf8");
    accounts = JSON.parse(fileData);
  } catch (error) {}

  const noDeployedAccounts = accounts.filter((a) => a.deployed === false);

  for (const accountToDeploy of noDeployedAccounts) {
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
    // await provider.waitForTransaction(transaction_hash);

    console.log("✅ Account deployed.");

    const accountIndex = accounts.findIndex(
      (a) => a.address === accountToDeploy.address
    );
    if (accountIndex !== -1) {
      accounts[accountIndex].deployed = true;
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
