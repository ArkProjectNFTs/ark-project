import { promises as fs } from "fs";

import loading from "loading-cli";

import { SOLIS_NETWORK, STARKNET_NETWORK } from "./constants";
import { updateOrderbookAddress } from "./contracts/executor";
import { deployOrderBook, updateExecutorAddress } from "./contracts/orderbook";
import { getProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

import "dotenv/config";

const artifactsPath = "../../contracts/target/dev/";

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

async function deployArkchainContracts() {
  const { solisProvider, starknetProvider } = getProvider(
    STARKNET_NETWORK,
    SOLIS_NETWORK
  );

  const { starknetAdminAccount, arkchainAdminAccount } = getExistingAccounts(
    STARKNET_NETWORK,
    SOLIS_NETWORK
  );

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.account.address}`);
  }

  console.log("\n");

  const arkchainSpinner = loading("💠 Deploying Arkchain Contracts...").start();

  if (arkchainAdminAccount) {
    const orderbookContract = await deployOrderBook(
      artifactsPath,
      arkchainAdminAccount.account,
      solisProvider,
      arkchainAdminAccount.account.address
    );
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const contracts = JSON.parse(fileContent);
    const { executor: executorAddress } = contracts[STARKNET_NETWORK];

    arkchainSpinner.text = "💠 Updating executor address...";
    const existingContracts = await getExistingContracts();
    existingContracts[SOLIS_NETWORK].orderbook = orderbookContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );

    await updateExecutorAddress(
      solisProvider,
      arkchainAdminAccount.account,
      orderbookContract.address,
      executorAddress
    );

    arkchainSpinner.text = "💠 Updating Executor Contract on Starknet...";

    if (starknetAdminAccount) {
      await updateOrderbookAddress(
        starknetProvider,
        starknetAdminAccount.account,
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

deployArkchainContracts();
