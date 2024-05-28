import { Account, RpcProvider } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import {
  deployOrderBook,
  updateExecutorAddress
} from "../src/contracts/orderbook";

async function run() {
  if (
    !process.env.STARKNET_ADMIN_ADDRESS_DEV ||
    !process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV
  ) {
    throw new Error("STARKNET_ADMIN_ADDRESS_DEV env is not set");
  }

  if (
    !process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV ||
    !process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_DEV
  ) {
    throw new Error("STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV is not set");
  }

  if (!process.env.STARKNET_EXECUTOR_ADDRESS_DEV) {
    throw new Error("STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV is not set");
  }

  if (!process.env.SOLIS_ADMIN_ADDRESS_DEV) {
    throw new Error("SOLIS_ADMIN_ADDRESS_DEV is not set");
  }

  if (!process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV) {
    throw new Error("SOLIS_ADMIN_PRIVATE_KEY_DEV is not set");
  }

  const provider = new RpcProvider({ nodeUrl: "http://localhost:5050" });
  const solisProvider = new RpcProvider({ nodeUrl: "http://localhost:7777" });
  const starknetAdminAccount = new Account(
    provider,
    process.env.STARKNET_ADMIN_ADDRESS_DEV,
    process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV,
    "1"
  );
  const starknetSolisAccount = new Account(
    provider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV,
    "1"
  );
  const chainId = await provider.getChainId();

  const orderbookContract = await deployOrderBook(
    ARTIFACTS_PATH,
    starknetSolisAccount,
    solisProvider,
    starknetSolisAccount.address,
    chainId
  );

  console.log({
    orderbookContract: orderbookContract.address,
    "process.env.STARKNET_EXECUTOR_ADDRESS_DEV":
      process.env.STARKNET_EXECUTOR_ADDRESS_DEV
  });

  await updateExecutorAddress(
    solisProvider,
    starknetSolisAccount,
    orderbookContract.address,
    process.env.STARKNET_EXECUTOR_ADDRESS_DEV
  );

  // await updateOrderbookAddress(
  //   provider,
  //   starknetAdminAccount,
  //   process.env.STARKNET_EXECUTOR_ADDRESS_DEV,
  //   orderbookContract.address
  // );

  // await setSolisAddresses(
  //   orderbookContract.address,
  //   process.env.STARKNET_EXECUTOR_ADDRESS_DEV,
  //   "http://localhost:7777"
  // );

  console.log(`Orderbook contract\t${orderbookContract.address}`);
}

run();
