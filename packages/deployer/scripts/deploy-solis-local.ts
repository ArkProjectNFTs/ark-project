import { Account } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import { updateOrderbookAddress } from "../src/contracts/executor";
import {
  deployOrderBook,
  updateExecutorAddress
} from "../src/contracts/orderbook";
import { getSolisProvider, getStarknetProvider } from "../src/providers";
import { setSolisAddresses } from "../src/solis";

async function run() {
  if (
    !process.env.STARKNET_ADMIN_ADDRESS_DEV ||
    !process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV ||
    !process.env.SOLIS_ADMIN_ADDRESS_DEV ||
    !process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV ||
    !process.env.STARKNET_EXECUTOR_ADDRESS_DEV
  ) {
    console.error(
      "Missing environment variables, see README.md for more information"
    );
    process.exit(1);
  }

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
    process.env.STARKNET_EXECUTOR_ADDRESS_DEV
  );

  await updateOrderbookAddress(
    starknetProvider,
    starknetAdminAccount,
    process.env.STARKNET_EXECUTOR_ADDRESS_DEV,
    orderbookContract.address
  );

  await setSolisAddresses(
    orderbookContract.address,
    process.env.STARKNET_EXECUTOR_ADDRESS_DEV,
    solisNodeUrl
  );

  console.log(`Orderbook contract\t${orderbookContract.address}`);
}

run();
