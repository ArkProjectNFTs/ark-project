import "dotenv/config";

import { stark } from "starknet";

import {
  approveERC721,
  createAuction,
  createBroker,
  fetchOrCreateAccount,
  getOrderStatus
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { mintERC721 } from "./utils/mintERC721.js";
import { whitelistBroker } from "./utils/whitelistBroker.js";

(async () => {
  // Create test accounts
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  // Create and whitelist broker
  const brokerId = stark.randomAddress();
  await createBroker(config, { brokerID: brokerId });
  await whitelistBroker(config, adminAccount, brokerId);

  // Mint and approve seller NFT
  const tokenId = await getCurrentTokenId(config, nftContract);

  await mintERC721(config.starknetProvider, sellerAccount);
  await approveERC721(config, {
    contractAddress: nftContract,
    starknetAccount: sellerAccount,
    tokenId
  });

  // Create auction
  const orderHash = await createAuction(config, {
    starknetAccount: sellerAccount,
    order: {
      brokerId,
      tokenAddress: nftContract,
      tokenId,
      startAmount: BigInt(1),
      endAmount: BigInt(10)
    },
    approveInfo: {
      tokenAddress: nftContract,
      tokenId
    }
  });

  const { orderStatus } = await getOrderStatus(config, { orderHash });

  console.log("Auction order status: ", orderStatus);
})();
