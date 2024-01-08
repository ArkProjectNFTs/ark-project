import { promises as fs } from "fs";

import { program } from "commander";
import loading from "loading-cli";

import { updateOrderbookAddress } from "./contracts/executor";
import { deployOrderBook, updateExecutorAddress } from "./contracts/orderbook";
import { getSolisProvider, getStarknetProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingContracts,
  getExistingSolisAccounts,
  getExistingStarknetAccounts
} from "./utils";

import "dotenv/config";

const artifactsPath = "../../contracts/target/dev/";

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.option("-so, --solis <type>", "Solis Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;
const solisNetwork = options.solis;

async function setSolisAddresses(
  orderbookAddress: string,
  executorAddress: string
) {
  const url = process.env.ARKCHAIN_RPC_URL || "http://127.0.0.1:7777";
  const postData = {
    jsonrpc: "2.0",
    id: "1",
    method: "katana_setSolisAddresses",
    params: {
      addresses: {
        orderbook_arkchain: orderbookAddress,
        executor_starknet: executorAddress
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await response.json();
    console.log("Ok");
  } catch (error) {
    console.error("Error:", error);
  }
}

async function deployArkchainContracts(
  solisNetwork: string,
  starknetNetwork: string
) {
  const solisProvider = getSolisProvider(solisNetwork);
  const arkchainAccounts = getExistingSolisAccounts(solisNetwork);

  const arkchainAdminAccount = arkchainAccounts[0];

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.address}`);
  }

  console.log("\n");

  const arkchainSpinner = loading("💠 Deploying Arkchain Contracts...").start();

  if (arkchainAdminAccount) {
    const orderbookContract = await deployOrderBook(
      artifactsPath,
      arkchainAdminAccount,
      solisProvider,
      arkchainAdminAccount.address
    );
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const contracts = JSON.parse(fileContent);
    const { executor: executorAddress } = contracts[starknetNetwork];

    arkchainSpinner.text = "💠 Updating executor address...";
    const existingContracts = await getExistingContracts();
    existingContracts[solisNetwork].orderbook = orderbookContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );

    await updateExecutorAddress(
      solisProvider,
      arkchainAdminAccount,
      orderbookContract.address,
      executorAddress
    );

    arkchainSpinner.text = "💠 Updating Executor Contract on Starknet...";

    const starknetProvider = getStarknetProvider(starknetNetwork);
    const starknetAccounts = getExistingStarknetAccounts(starknetNetwork);
    const adminAccount = starknetAccounts[0];

    if (adminAccount) {
      await updateOrderbookAddress(
        starknetProvider,
        adminAccount,
        executorAddress,
        orderbookContract.address
      );
    }

    arkchainSpinner.text = "💠 Updating Contracts on solis rpc...";
    await setSolisAddresses(orderbookContract.address, executorAddress);

    arkchainSpinner.stop();
    console.log("💠 Arkchain Contracts");
    console.log(`- Orderbook contract: ${orderbookContract.address}\n`);
  }
}

deployArkchainContracts(solisNetwork, starknetNetwork);
