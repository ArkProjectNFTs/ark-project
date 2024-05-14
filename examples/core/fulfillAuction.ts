import "dotenv/config";

import { stark } from "starknet";

import {
  approveERC721,
  AuctionV1,
  createAuction,
  createBroker,
  createOffer,
  fetchOrCreateAccount,
  fulfillAuction,
  FulfillAuctionInfo,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config } from "./config/index.js";
import { STARKNET_NFT_ADDRESS } from "./constants/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { mintERC721 } from "./utils/mintERC721.js";
import { whitelistBroker } from "./utils/whitelistBroker.js";

(async () => {
  // Create test accounts
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS,
    process.env.SOLIS_ADMIN_PRIVATE_KEY
  );

  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const buyerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
  );

  // Create and whitelist broker
  const brokerId = stark.randomAddress();
  await createBroker(config, { brokerID: brokerId });
  await whitelistBroker(config, adminAccount, brokerId);

  // Mint and approve seller NFT
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  await mintERC721(config.starknetProvider, sellerAccount);
  await approveERC721(config, {
    contractAddress: STARKNET_NFT_ADDRESS,
    starknetAccount: sellerAccount,
    tokenId
  });

  // Create auction
  const order: AuctionV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: 1,
    endAmount: 10
  };

  const orderHash = await createAuction(config, {
    starknetAccount: sellerAccount,
    arkAccount: adminAccount,
    order
  });

  // Create offer
  const offer: OfferV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: 1
  };

  const offerOrderHash = await createOffer(config, {
    starknetAccount: buyerAccount,
    arkAccount: adminAccount,
    offer
  });

  // Fulfill auction
  const fulfillAuctionInfo: FulfillAuctionInfo = {
    orderHash,
    relatedOrderHash: offerOrderHash,
    tokenAddress: order.tokenAddress,
    tokenId,
    brokerId
  };

  await fulfillAuction(config, {
    starknetAccount: sellerAccount,
    arkAccount: adminAccount,
    fulfillAuctionInfo
  });

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  const { orderStatus: orderStatus } = await getOrderStatus(config, {
    orderHash
  });

  console.log("Auction order status: ", orderStatus);
})();
