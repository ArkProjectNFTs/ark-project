import { promises as fs } from "fs";
import { resolve } from "path";

import { Account, RpcProvider } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import { deployERC20 } from "../src/contracts/erc20";
import { deployERC721 } from "../src/contracts/erc721";
import { deployERC721Royalties } from "../src/contracts/erc721royalties";
import { deployExecutor } from "../src/contracts/executor";
import { deployMessaging } from "../src/contracts/messaging";
import { getFeeAddress } from "../src/providers";

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

  const provider = new RpcProvider({ nodeUrl: "http://localhost:5050" });
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
    getFeeAddress("dev"),
    messagingContract.address
  );

  const ethContract = await deployERC20(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "ETH",
    "ETH"
  );

  const nftContract = await deployERC721(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "ARKTEST",
    "ARKTEST"
  );

  const nftContractFixedFees = await deployERC721(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "ARKTESTFIXEDFEES",
    "ARKTESTFIXEDFEES"
  );

  const nftContractRoyalties = await deployERC721Royalties(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "0x29873c310fbefde666dc32a1554fea6bb45eecc84f680f8a2b0a8fbb8cb89af"
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

  const contractsFilePath = resolve(__dirname, "../../../contracts.dev.json");
  const contractsContent = JSON.stringify({
    messaging: messagingContract.address,
    executor: executorContract.address,
    nftContract: nftContract.address,
    nftContractFixedFees: nftContractFixedFees.address,
    nftContractRoyalties: nftContractRoyalties.address,
    eth: ethContract.address
  });
  await fs.writeFile(contractsFilePath, contractsContent);
}

run();
