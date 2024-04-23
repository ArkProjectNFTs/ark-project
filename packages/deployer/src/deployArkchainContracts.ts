import { promises as fs } from "fs";

import { program } from "commander";
import loading from "loading-cli";
import * as sn from "starknet";

import { ARTIFACTS_PATH } from "./constants";
import { updateOrderbookAddress } from "./contracts/executor";
import {
  deployOrderBook,
  updateExecutorAddress,
  upgradeOrderbook
} from "./contracts/orderbook";
import { getSolisProvider, getStarknetProvider } from "./providers";
import { setSolisAddresses } from "./solis";
import { ProviderNetwork } from "./types";
import {
  getContractsFilePath,
  getExistingContracts,
  getSolisAccounts,
  getStarknetAccounts
} from "./utils";

import "dotenv/config";

async function deployArkchainContracts(
  starknetNetwork: ProviderNetwork,
  solisNetwork: ProviderNetwork
) {
  const { provider: starknetProvider } = getStarknetProvider(starknetNetwork);
  const { provider: solisProvider, nodeUrl: solisNodeUrl } =
    getSolisProvider(solisNetwork);
  const { starknetAdminAccount } = getStarknetAccounts(starknetNetwork);
  const { arkchainAdminAccount } = getSolisAccounts(solisNetwork);
  const existingContracts = await getExistingContracts();

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.address}`);
  }

  console.log("\n");

  const arkchainSpinner = loading("💠 Deploying Arkchain Contracts...").start();
  let orderbookContract: sn.Contract;

  if (arkchainAdminAccount) {
    if (existingContracts[solisNetwork].orderbook) {
      console.log("💠 Upgrading Arkchain contracts...");
      arkchainSpinner.text = "💠 Upgrading Arkchain contracts...";
      orderbookContract = await upgradeOrderbook(
        ARTIFACTS_PATH,
        arkchainAdminAccount,
        solisProvider,
        existingContracts[solisNetwork].orderbook
      );
    } else {
      const chain_id = await starknetProvider.getChainId();
      orderbookContract = await deployOrderBook(
        ARTIFACTS_PATH,
        arkchainAdminAccount,
        solisProvider,
        arkchainAdminAccount.address,
        chain_id
      );
      const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
      const contracts = JSON.parse(fileContent);
      const { executor: executorAddress } = contracts[starknetNetwork];

      arkchainSpinner.text = "💠 Updating executor address...";
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

      if (starknetAdminAccount) {
        await updateOrderbookAddress(
          starknetProvider,
          starknetAdminAccount,
          executorAddress,
          orderbookContract.address
        );
      }

      arkchainSpinner.text = "💠 Updating Contracts on solis rpc...";
      await setSolisAddresses(
        orderbookContract.address,
        executorAddress,
        solisNodeUrl
      );
    }

    arkchainSpinner.stop();
    console.log("💠 Arkchain Contracts");
    console.log(`- Orderbook contract: ${orderbookContract.address}\n`);
  }
}

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.option("-so, --solis <type>", "Solis Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;
const solisNetwork = options.solis;

deployArkchainContracts(starknetNetwork, solisNetwork);
