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

const arkchainArtifactsPath = "../../crates/ark-contracts/arkchain/target/dev/";
const commonArtifactsPath = "../../crates/ark-contracts/common/target/dev/";

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

  const { starknetAccounts, arkchainAccounts } = getExistingAccounts(
    STARKNET_NETWORK,
    SOLIS_NETWORK
  );

  const arkchainAdminAccount = arkchainAccounts[0];

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.address}`);
  }

  console.log("\n");

  let existingContracts = await getExistingContracts();

  const arkchainSpinner = loading("💠 Depoying fake eth contract...").start();

  const ethContract = await deployERC20(
    commonArtifactsPath,
    arkchainAdminAccount,
    solisProvider,
    "ETH",
    "ETH"
  );

  existingContracts = {
    ...existingContracts,
    arkchain: {
      ...existingContracts.arkchain,
      eth: ethContract.address
    }
  };
  await fs.writeFile(getContractsFilePath(), JSON.stringify(existingContracts));

  arkchainSpinner.text = "💠 Depoying Arkchain Contracts...";

  if (arkchainAdminAccount) {
    const orderbookContract = await deployOrderBook(
      arkchainArtifactsPath,
      arkchainAdminAccount,
      solisProvider,
      arkchainAdminAccount.address
    );
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const contracts = JSON.parse(fileContent);
    const { executor: executorAddress } = contracts[STARKNET_NETWORK];

    const existingContracts = await getExistingContracts();
    existingContracts[SOLIS_NETWORK].orderbook = orderbookContract.address;
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
    console.log(`- ETH contract: ${ethContract.address}\n`);
  }
}

deployArkchainContracts();
