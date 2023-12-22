import { promises as fs } from "fs";

import * as sn from "starknet";

import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { deployMessaging, upgradeMessaging } from "./contracts/messaging";
import { getFeeAddress, getProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

const snArtifactsPath = "../../crates/ark-contracts/starknet/target/dev/";

const loading = require("loading-cli");

const STARKNET_NETWORK = "katana";

async function deployStarknetContracts() {
  const starknetProvider = getProvider(STARKNET_NETWORK);
  const starknetAccounts = await getExistingAccounts(STARKNET_NETWORK);

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
  if (existingContracts[STARKNET_NETWORK].messaging) {
    starknetSpinner.text = "Upgrading Messaging Contract...";
    messagingContract = await upgradeMessaging(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[STARKNET_NETWORK].messaging
    );
  } else {
    starknetSpinner.text = "Deploying Messaging Contract...";
    messagingContract = await deployMessaging(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider
    );
    existingContracts[STARKNET_NETWORK].messaging = messagingContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  starknetSpinner.text = "⚡ Deploying Executor Contract...";
  let executorContract: sn.Contract;
  if (existingContracts[STARKNET_NETWORK].executor) {
    starknetSpinner.text = "⚡ Upgrading Executor Contract...";
    executorContract = await upgradeExecutor(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[STARKNET_NETWORK].messaging
    );
  } else {
    starknetSpinner.text = "⚡ Deploying Executor Contract...";
    executorContract = await deployExecutor(
      snArtifactsPath,
      starknetAdminAccount,
      starknetProvider,
      getFeeAddress(STARKNET_NETWORK),
      messagingContract.address
    );
    existingContracts[STARKNET_NETWORK].executor = executorContract.address;
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
