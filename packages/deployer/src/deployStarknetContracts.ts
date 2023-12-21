import { promises as fs } from "fs";

import * as sn from "starknet";

import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { deployMessaging, upgradeMessaging } from "./contracts/messaging";
import { getProvider, STARKGATE_ADDRESS } from "./providers";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

const snArtifactsPath = "../../crates/ark-contracts/starknet/target/dev/";

const loading = require("loading-cli");

async function deployStarknetContracts() {
  const starknetProvider = getProvider("goerli");
  const starknetAccounts = await getExistingAccounts("goerli");
  const [starknetAdminAccount, ...otherUsers] = starknetAccounts;

  const existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  if (otherUsers.length > 0) {
    otherUsers.forEach((user, index) => {
      console.log(`| User ${index}        | ${user.address}`);
    });
  }

  console.log("");

  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();

  let messagingContract: sn.Contract;
  if (existingContracts.goerli.messaging) {
    starknetSpinner.text = "Upgrading Messaging Contract...";
    messagingContract = await upgradeMessaging(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts.goerli.messaging
    );
  } else {
    starknetSpinner.text = "Deploying Messaging Contract...";
    messagingContract = await deployMessaging(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider
    );
    existingContracts.goerli.messaging = messagingContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  starknetSpinner.text = "⚡ Deploying Executor Contract...";
  let executorContract: sn.Contract;
  if (existingContracts.goerli.executor) {
    starknetSpinner.text = "⚡ Upgrading Executor Contract...";
    executorContract = await upgradeExecutor(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts.goerli.messaging
    );
  } else {
    starknetSpinner.text = "⚡ Deploying Executor Contract...";
    executorContract = await deployExecutor(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      STARKGATE_ADDRESS,
      messagingContract.address
    );
    existingContracts.goerli.executor = executorContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  starknetSpinner.stop();

  console.log("STARKNET CONTRACTS");
  console.log("==================\n");
  console.log(`| Messaging contract | ${messagingContract.address}`);
  console.log(`| Executor contract  | ${executorContract.address}`);
  console.log("");
  console.log(
    "<!> Don't forget to update the orderbook contract address to the executor contract."
  );
}

deployStarknetContracts();
