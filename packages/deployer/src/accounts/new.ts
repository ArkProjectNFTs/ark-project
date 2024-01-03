import { promises as fs } from "fs";
import { join } from "path";

import { Command } from "commander";
import * as sn from "starknet";

import { OZaccountClassHash } from "./constants";

export async function createNewAccounts(
  numberOfAccounts: number,
  network: string
) {
  const accountsFilePath = join(__dirname, `../../accounts/${network}.json`);
  try {
    await fs.access(join(__dirname, "../../accounts"));
  } catch (error) {
    await fs.mkdir(join(__dirname, "../../accounts"));
  }

  console.log(
    `| Account                                                            | Private key                                                       | Public key`
  );

  let existingAccounts = [];
  try {
    const fileData = await fs.readFile(accountsFilePath, "utf8");
    existingAccounts = JSON.parse(fileData);
  } catch (error) {}

  for (let i = 0; i < numberOfAccounts; i++) {
    const privateKey = sn.stark.randomAddress();
    const publicKey = sn.ec.starkCurve.getStarkKey(privateKey);

    const accountAddress = sn.hash.calculateContractAddressFromHash(
      publicKey,
      OZaccountClassHash,
      sn.CallData.compile({
        publicKey: publicKey
      }),
      0
    );

    existingAccounts = existingAccounts.concat({
      address: `0x${accountAddress.replace("0x", "").padStart(64, "0")}`,
      privateKey: privateKey,
      publicKey: publicKey,
      deployed: false
    });

    console.log(
      `| 0x${accountAddress
        .replace("0x", "")
        .padStart(64, "0")} | ${privateKey} | ${publicKey}`
    );
  }

  await fs.writeFile(accountsFilePath, JSON.stringify(existingAccounts));
}

const program = new Command();
program
  .option("-n, --network <type>", "Network to use", "dev")
  .option("-a, --accounts <number>", "Number of accounts to create", "1");

program.parse(process.argv);

const options = program.opts();
const numberOfAccounts = parseInt(options.accounts || 1, 10);
const network = options.network;

createNewAccounts(numberOfAccounts, network).catch(console.error);
