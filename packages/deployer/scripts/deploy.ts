import { promises as fs } from "fs";
import { resolve } from "path";

import { Account, RpcProvider } from "starknet";

import { ARTIFACTS_PATH } from "../src/constants";
import { deployERC20 } from "../src/contracts/erc20";
import { deployERC20Trade } from "../src/contracts/erc20trade";
import { deployERC721 } from "../src/contracts/erc721";
import { deployERC721Royalties } from "../src/contracts/erc721royalties";
import { deployExecutor } from "../src/contracts/executor";
import { getFeeAddress } from "../src/providers";

async function run() {
  if (
    !process.env.STARKNET_ADMIN_ADDRESS_DEV ||
    !process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV
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

  const executorContract = await deployExecutor(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    getFeeAddress("dev")
  );

  const ethContract = await deployERC20(
    ARTIFACTS_PATH,
    starknetAdminAccount,
    provider,
    "ETH",
    "ETH"
  );

  const ethTradeContract = await deployERC20Trade(
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

  const contractsFilePath = resolve(__dirname, "../../../contracts.dev.json");
  const contractsContent = JSON.stringify({
    executor: executorContract.address,
    nftContract: nftContract.address,
    nftContractFixedFees: nftContractFixedFees.address,
    nftContractRoyalties: nftContractRoyalties.address,
    eth: ethContract.address,
    ethTrade: ethTradeContract.address
  });
  await fs.writeFile(contractsFilePath, contractsContent);
}

run();
