import fs from "fs";
import { resolve } from "path";

import { Account } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import { updateOrderbookAddress } from "../src/contracts/executor";
import {
  deployOrderBook,
  updateExecutorAddress
} from "../src/contracts/orderbook";
import { getSolisProvider, getStarknetProvider } from "../src/providers";
import { setSolisAddresses } from "../src/solis";

const contractsFilePath = resolve(__dirname, "../../../contracts.dev.json");

async function getContracts() {
  const contracts = await import(contractsFilePath);

  return contracts.default;
}

async function run() {
  if (
    !process.env.STARKNET_ADMIN_ADDRESS_DEV ||
    !process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV ||
    !process.env.SOLIS_ADMIN_ADDRESS_DEV ||
    !process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  ) {
    console.error(
      "Missing environment variables, see README.md for more information"
    );
    process.exit(1);
  }

  const contracts = await getContracts();
  const { provider: starknetProvider } = getStarknetProvider("dev");
  const { provider: solisProvider, nodeUrl: solisNodeUrl } =
    getSolisProvider("dev");
  const starknetAdminAccount = new Account(
    starknetProvider,
    process.env.STARKNET_ADMIN_ADDRESS_DEV,
    process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV,
    "1"
  );
  const solisAdminAccount = new Account(
    solisProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV,
    "1"
  );
  const chainId = await starknetProvider.getChainId();

  const orderbookContract = await deployOrderBook(
    ARTIFACTS_PATH,
    solisAdminAccount,
    solisProvider,
    solisAdminAccount.address,
    chainId
  );

  await updateExecutorAddress(
    solisProvider,
    solisAdminAccount,
    orderbookContract.address,
    contracts.executor
  );

  await updateOrderbookAddress(
    starknetProvider,
    starknetAdminAccount,
    contracts.executor,
    orderbookContract.address
  );

  await setSolisAddresses(
    orderbookContract.address,
    contracts.executor,
    solisNodeUrl
  );

  const contractsContent = JSON.stringify(
    {
      ...contracts,
      orderbook: orderbookContract.address
    },
    null,
    2
  );

  fs.writeFileSync(contractsFilePath, contractsContent);

  console.log(`Orderbook contract\t${orderbookContract.address}`);
}

run();
