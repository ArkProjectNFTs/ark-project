import { promises as fs } from "fs";

import loading from "loading-cli";

import { updateOrderbookAddress } from "./contracts/executor";
import { deployOrderBook } from "./contracts/orderbook";
import { getProvider } from "./providers";
import { getContractsFilePath, getExistingAccounts } from "./utils";

const arkchainArtifactsPath = "../../crates/ark-contracts/arkchain/target/dev/";

const STARKNET_NETWORK = "goerli";

async function deployArkchainContracts() {
  const starknetProvider = getProvider(STARKNET_NETWORK);
  const starknetAccounts = await getExistingAccounts(STARKNET_NETWORK);

  const solisProvider = getProvider("solis");
  const arkchainAccounts = await getExistingAccounts("solis");
  const arkchainAdminAccount = arkchainAccounts[0];

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.address}`);
  }

  console.log("\n");

  const arkchainSpinner = loading("💠 Depoying Arkchain Contracts...").start();

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

    arkchainSpinner.stop();
    console.log("💠 Arkchain Contracts");
    console.log(`- Orderbook contract: ${orderbookContract.address}\n`);
  }
}

deployArkchainContracts();
