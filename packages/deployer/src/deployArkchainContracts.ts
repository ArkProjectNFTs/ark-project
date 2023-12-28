import { promises as fs } from "fs";

import loading from "loading-cli";

import { deployERC20 } from "./contracts/erc20";
import { updateOrderbookAddress } from "./contracts/executor";
import { deployOrderBook, updateExecutorAddress } from "./contracts/orderbook";
import { getProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

const arkchainArtifactsPath = "../../crates/ark-contracts/arkchain/target/dev/";
const commonArtifactsPath = "../../crates/ark-contracts/common/target/dev/";

const STARKNET_NETWORK = "katana";

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

    existingContracts.arkchain.orderbook = orderbookContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );

    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const contracts = JSON.parse(fileContent);
    const { executor: executorAddress } = contracts[STARKNET_NETWORK];

    arkchainSpinner.text = "💠 Updating executor address...";
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

    arkchainSpinner.stop();
    console.log("💠 Arkchain Contracts");
    console.log(`- Orderbook contract: ${orderbookContract.address}\n`);
    console.log(`- ETH contract: ${ethContract.address}\n`);
  }
}

deployArkchainContracts();
