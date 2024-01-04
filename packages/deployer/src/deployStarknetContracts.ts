import { promises as fs } from "fs";
import { join } from "path";

import * as sn from "starknet";

import "dotenv/config";

import { SOLIS_NETWORK, STARKNET_NETWORK } from "./constants";
import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { deployMessaging, upgradeMessaging } from "./contracts/messaging";
import { getFeeAddress, getProvider } from "./providers";
import { ProviderNetwork } from "./types";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

const artifactsPath = "../../contracts/target/dev/";

const loading = require("loading-cli");

function getMessagingFilePath(network: ProviderNetwork): string {
  switch (network) {
    case "mainnet":
      return join(__dirname, "../../../crates/solis/messaging.json");
    case "goerli":
      return join(__dirname, "../../../crates/solis/messaging.goerli.json");
    case "sepolia":
      return join(__dirname, "../../../crates/solis/messaging.sepolia.json");
    case "dev":
      return join(__dirname, "../../../crates/solis/messaging.local.json");
    default:
      return join(__dirname, "../../../crates/solis/messaging.local.json");
  }
}

async function deployStarknetContracts() {
  const { starknetProvider } = getProvider(STARKNET_NETWORK, SOLIS_NETWORK);
  const { starknetAdminAccount } = getExistingAccounts(
    STARKNET_NETWORK,
    SOLIS_NETWORK
  );

  const existingContracts = await getExistingContracts();
  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.account.address}`);

  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();

  let messagingContract: sn.Contract;
  if (existingContracts[STARKNET_NETWORK].messaging) {
    starknetSpinner.text = "Upgrading Messaging Contract...";
    messagingContract = await upgradeMessaging(
      artifactsPath,
      starknetAdminAccount.account,
      starknetProvider,
      existingContracts[STARKNET_NETWORK].messaging
    );
  } else {
    starknetSpinner.text = "Deploying Messaging Contract...";
    messagingContract = await deployMessaging(
      artifactsPath,
      starknetAdminAccount.account,
      starknetProvider,
      starknetAdminAccount.appchain_account?.address || ""
    );
    existingContracts[STARKNET_NETWORK].messaging = messagingContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  // starknetSpinner.text = "⚡ Deploying Executor Contract...";
  // let executorContract: sn.Contract;
  // if (existingContracts[STARKNET_NETWORK].executor) {
  //   starknetSpinner.text = "⚡ Upgrading Executor Contract...";
  //   executorContract = await upgradeExecutor(
  //     artifactsPath,
  //     starknetAdminAccount.account,
  //     starknetProvider,
  //     existingContracts[STARKNET_NETWORK].messaging
  //   );
  // } else {
  //   starknetSpinner.text = "⚡ Deploying Executor Contract...";
  //   executorContract = await deployExecutor(
  //     artifactsPath,
  //     starknetAdminAccount.account,
  //     starknetProvider,
  //     getFeeAddress(STARKNET_NETWORK),
  //     messagingContract.address
  //   );

  //   existingContracts[STARKNET_NETWORK].executor = executorContract.address;
  //   await fs.writeFile(
  //     getContractsFilePath(),
  //     JSON.stringify(existingContracts)
  //   );

  //   const messagingFilePath = getMessagingFilePath(STARKNET_NETWORK);
  //   const configData = JSON.parse(await fs.readFile(messagingFilePath, "utf8"));
  //   configData.contract_address = messagingContract.address;
  //   configData.sender_address = starknetAdminAccount.appchain_account?.address;
  //   configData.private_key = starknetAdminAccount.appchain_account?.privateKey;
  //   await fs.writeFile(messagingFilePath, JSON.stringify(configData, null, 2));
  // }

  // starknetSpinner.stop();

  // console.log("STARKNET CONTRACTS");
  // console.log("==================\n");
  // console.log(`| Messaging contract | ${messagingContract.address}`);
  // console.log(`| Executor contract  | ${executorContract.address}`);
}

deployStarknetContracts();
