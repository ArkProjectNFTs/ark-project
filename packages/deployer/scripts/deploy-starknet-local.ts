import { promises as fs } from "fs";
import { resolve } from "path";

import { Account, RpcProvider } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import { deployERC721 } from "../src/contracts/erc721";
import { deployExecutor } from "../src/contracts/executor";
import { deployMessaging } from "../src/contracts/messaging";

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

  const provider = new RpcProvider({ nodeUrl: "http://localhost:5050" });
  const starknetAdminAccount = new Account(
    provider,
    process.env.STARKNET_ADMIN_ADDRESS_DEV,
    process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV,
    "1"
  );
  const starknetSolisAccount = new Account(
    provider,
    process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV,
    process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_DEV,
    "1"
  );

  const messagingContract = await deployMessaging(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    starknetSolisAccount?.address || ""
  );

  const executorContract = await deployExecutor(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    messagingContract.address
  );

  // const ethContract = await deployERC20(
  //   ARTIFACTS_PATH,
  //   starknetAdminAccount,
  //   provider,
  //   "ETH",
  //   "ETH"
  // );

  const nftContract = await deployERC721(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider
  );

  const messagingConfigFilePath = resolve(
    __dirname,
    "../../../crates/solis/messaging.local.json"
  );

  const messagingConfigContent = JSON.stringify({
    chain: "starknet",
    rpc_url: "http://0.0.0.0:5050",
    contract_address: messagingContract.address,
    sender_address: process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS_DEV,
    private_key: process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY_DEV,
    interval: 2,
    from_block: 0
  });

  await fs.writeFile(messagingConfigFilePath, messagingConfigContent);

  console.log(`Messaging contract\t${messagingContract.address}`);
  console.log(`Executor contract\t${executorContract.address}`);
  console.log(`ERC721 contract\t\t${nftContract.address}`);
}

run();
