import { promises as fs } from "fs";
import path from "path";

import { program } from "commander";

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
  getStarknetAccounts
} from "./utils";

// Function to get the path for messaging.json
function getMessagingFilePath() {
  return path.join(__dirname, "../../../messaging.json");
}

async function deployStarknetContracts(starknetNetwork: ProviderNetwork) {
  const { provider: starknetProvider, nodeUrl: starknetNodeUrl } =
    getStarknetProvider(starknetNetwork);
  const { starknetAdminAccount, starknetSolisAccount } =
    getStarknetAccounts(starknetNetwork);
  const existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();

  let messagingContract;
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
  }

  starknetSpinner.text = "⚡ Deploying Executor Contract...";
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
      getFeeAddress(starknetNetwork),
      messagingContract.address
    );
    existingContracts[starknetNetwork].executor = executorContract.address;
  }

  // Determine from_block based on the network
  let fromBlock;
  if (starknetNetwork === "sepolia") {
    fromBlock = 72242;
  } else if (starknetNetwork === "mainnet") {
    fromBlock = 644128;
  } else {
    fromBlock = 0; // default or handle other networks if any
  }

  // Create the messaging file at the specified path
  const messagingFilePath = getMessagingFilePath();
  const messagingFileContent = {
    chain: "starknet",
    rpc_url: starknetNodeUrl,
    contract_address: messagingContract.address,
    sender_address: starknetSolisAccount?.address,
    private_key: starknetSolisAccount?.privateKey,
    interval: 10,
    from_block: fromBlock
  };
  await fs.writeFile(
    messagingFilePath,
    JSON.stringify(messagingFileContent, null, 2)
  );

  // Update the contracts.json file
  const contractsFilePath = getContractsFilePath();
  const contractsContent = JSON.parse(
    await fs.readFile(contractsFilePath, "utf8")
  );

  contractsContent[starknetNetwork].messaging = messagingContract.address;
  contractsContent[starknetNetwork].executor = executorContract.address;

  await fs.writeFile(
    contractsFilePath,
    JSON.stringify(contractsContent, null, 2)
  );

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
