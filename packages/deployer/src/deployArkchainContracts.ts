import { promises as fs } from "fs";

import { program } from "commander";
import loading from "loading-cli";

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

  console.log("\nARKCHAIN ACCOUNTS");
  console.log("=================\n");
  if (arkchainAdminAccount) {
    console.log(`| Admin account |  ${arkchainAdminAccount.address}`);
  }

  console.log("\n");

  const arkchainSpinner = loading("💠 Deploying Arkchain Contracts...").start();

  if (arkchainAdminAccount) {
    const chain_id = await starknetProvider.getChainId();
    const existingContracts = await getExistingContracts();
    if (existingContracts[solisNetwork].orderbook) {
      await upgradeOrderbook(
        ARTIFACTS_PATH,
        arkchainAdminAccount,
        solisProvider,
        existingContracts[solisNetwork].orderbook
      );
    } else {
      const orderbookContract = await deployOrderBook(
        ARTIFACTS_PATH,
        arkchainAdminAccount,
        solisProvider,
        arkchainAdminAccount.address,
        chain_id
      );
      existingContracts[solisNetwork].orderbook = orderbookContract.address;
      arkchainSpinner.text = "💠 Updating executor address...";

      await fs.writeFile(
        getContractsFilePath(),
        JSON.stringify(existingContracts)
      );

      await updateExecutorAddress(
        solisProvider,
        arkchainAdminAccount,
        orderbookContract.address,
        existingContracts[starknetNetwork].executor
      );

      arkchainSpinner.text = "💠 Updating Executor Contract on Starknet...";

      if (starknetAdminAccount) {
        await updateOrderbookAddress(
          starknetProvider,
          starknetAdminAccount,
          existingContracts[starknetNetwork].executor,
          orderbookContract.address
        );
      }

      arkchainSpinner.text = "💠 Updating Contracts on solis rpc...";
      await setSolisAddresses(
        orderbookContract.address,
        existingContracts[starknetNetwork].executor,
        solisNodeUrl
      );

      arkchainSpinner.stop();
      console.log("💠 Arkchain Contracts");
      console.log(`- Orderbook contract: ${orderbookContract.address}\n`);
    }
  }
}

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.option("-so, --solis <type>", "Solis Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;
const solisNetwork = options.solis;

deployArkchainContracts(starknetNetwork, solisNetwork);
