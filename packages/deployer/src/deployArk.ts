import { promises as fs } from "fs";

import { program } from "commander";

import { ProviderNetwork } from "./types";

import "dotenv/config";

import loading from "loading-cli";

import { ARTIFACTS_PATH } from "./constants";
import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { setArkFees, setDefaultCreatorFees } from "./contracts/setFees";
import { getFeeAddress, getStarknetProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingContracts,
  getStarknetAccounts
} from "./utils";

async function deployStarknetContracts(starknetNetwork: ProviderNetwork) {
  console.log("\nSTARKNET NETWORK");
  console.log("================\n");
  console.log(`| Network | ${starknetNetwork}`);

  const { provider: starknetProvider } = getStarknetProvider(starknetNetwork);
  const { starknetAdminAccount } = getStarknetAccounts(starknetNetwork);
  const existingContracts = await getExistingContracts();
  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();

  let executorContract;
  if (existingContracts[starknetNetwork].executor) {
    console.log("⚡ Upgrading Executor Contract..");
    starknetSpinner.text = "⚡ Upgrading Executor Contract...";
    executorContract = await upgradeExecutor(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[starknetNetwork].executor
    );
  } else {
    starknetSpinner.text = "⚡ Deploying Executor Contract...";
    executorContract = await deployExecutor(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      getFeeAddress(starknetNetwork)
    );
    existingContracts[starknetNetwork].executor = executorContract.address;
  }

  // Update the contracts.json file
  const contractsFilePath = getContractsFilePath();
  const contractsContent = JSON.parse(
    await fs.readFile(contractsFilePath, "utf8")
  );

  contractsContent[starknetNetwork].executor = executorContract.address;

  await fs.writeFile(
    contractsFilePath,
    JSON.stringify(contractsContent, null, 2)
  );

  // Set Ark Fees
  await await setArkFees(
    executorContract.address,
    starknetProvider,
    starknetAdminAccount,
    25
  );

  // Set default creator Fees
  await setDefaultCreatorFees(
    executorContract.address,
    starknetProvider,
    starknetAdminAccount,
    "0x06bC109475810df11c7f046Ad72A5a52aAd8658123CC529309910d00bD4904C8",
    50
  );

  starknetSpinner.stop();
  console.log("STARKNET CONTRACTS");
  console.log("==================\n");
  console.log(`| Executor contract  | ${executorContract.address}`);
}

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;

deployStarknetContracts(starknetNetwork);
