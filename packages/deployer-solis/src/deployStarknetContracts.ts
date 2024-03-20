import { promises as fs } from "fs";

import { program } from "commander";
import * as sn from "starknet";

import { ProviderNetwork } from "./types";

import "dotenv/config";

import loading from "loading-cli";

import { ARTIFACTS_PATH } from "./constants";
import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { deployMessaging, upgradeMessaging } from "./contracts/messaging";
import { getFeeAddress, getStarknetProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingContracts,
  getMessagingFilePath,
  getStarknetAccounts
} from "./utils";

async function deployStarknetContracts(starknetNetwork: ProviderNetwork) {
  const { provider: starknetProvider } = getStarknetProvider(starknetNetwork);
  const { starknetAdminAccount, starknetSolisAccount } =
    getStarknetAccounts(starknetNetwork);
  const existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();
  let messagingContract: sn.Contract;
  if (existingContracts[starknetNetwork].messaging) {
    console.log("⚡ Upgrading Messaging Contract...");
    starknetSpinner.text = "⚡ Upgrading Messaging Contract...";
    messagingContract = await upgradeMessaging(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[starknetNetwork].messaging
    );
  } else {
    console.log("⚡ Deploying Messaging Contract...");
    starknetSpinner.text = "⚡ Deploying Messaging Contract...";
    messagingContract = await deployMessaging(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      starknetSolisAccount?.address || ""
    );
    existingContracts[starknetNetwork].messaging = messagingContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }
  starknetSpinner.text = "⚡ Deploying Executor Contract...";
  let executorContract: sn.Contract;
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
    starknetSpinner.text = "⚡ Deploying Executor Contract...";
    executorContract = await deployExecutor(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      getFeeAddress(starknetNetwork),
      messagingContract.address
    );
    existingContracts[starknetNetwork].executor = executorContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
    const messagingFilePath = getMessagingFilePath(starknetNetwork);
    const configData = JSON.parse(await fs.readFile(messagingFilePath, "utf8"));
    configData.contract_address = messagingContract.address;
    configData.sender_address = starknetSolisAccount?.address;
    configData.private_key = starknetSolisAccount?.privateKey;
    await fs.writeFile(messagingFilePath, JSON.stringify(configData, null, 2));
  }
  starknetSpinner.stop();
  console.log("STARKNET CONTRACTS");
  console.log("==================\n");
  console.log(`| Messaging contract | ${messagingContract.address}`);
  console.log(`| Executor contract  | ${executorContract.address}`);
}

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;

deployStarknetContracts(starknetNetwork);
