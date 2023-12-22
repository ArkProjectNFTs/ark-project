import { promises as fs } from "fs";
import { join } from "path";

import { Command } from "commander";
import { Account, CallData, RpcProvider } from "starknet";

import { getProvider } from "../providers";
import { OZaccountClassHash } from "./constants";

async function deployAccount(network: string) {
  const provider = getProvider(network);

  const accountsFilePath = join(__dirname, `../../accounts/${network}.json`);
  let accounts: any[] = [];
  try {
    const fileData = await fs.readFile(accountsFilePath, "utf8");
    accounts = JSON.parse(fileData);
  } catch (error) {}

  const noDeployedAccounts = accounts.filter((a) => a.deployed === false);

  for (const accountToDeploy of noDeployedAccounts) {
    const account = new Account(
      provider,
      accountToDeploy.address,
      accountToDeploy.privateKey,
      "1"
    );

    const { transaction_hash, contract_address } = await account.deployAccount({
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

const program = new Command();
program.option("-n, --network <type>", "Network to use", "goerli");

program.parse(process.argv);

const options = program.opts();
const network = options.network;

deployAccount(network).catch(console.error);
