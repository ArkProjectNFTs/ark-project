import "dotenv/config";

import { stark } from "starknet";

import {
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
  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  // Create auction
  const order: AuctionV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: BigInt(1),
    endAmount: BigInt(10)
  };

  console.log("Creating auction...");
  const orderHash = await createAuction(config, {
    starknetAccount: sellerAccount,
    order,
    approveInfo: {
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Create offer
  const offer: OfferV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: BigInt(1)
  };

  console.log("Creating offer...");
  const offerOrderHash = await createOffer(config, {
    starknetAccount: buyerAccount,
    offer,
    approveInfo: {
      currencyAddress: config.starknetCurrencyContract,
      amount: offer.startAmount
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Fulfill auction
  const fulfillAuctionInfo: FulfillAuctionInfo = {
    orderHash,
    relatedOrderHash: offerOrderHash,
    tokenAddress: order.tokenAddress,
    tokenId,
    brokerId
  };

  console.log("Fulfilling auction...");
  await fulfillAuction(config, {
    starknetAccount: sellerAccount,
    fulfillAuctionInfo
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { orderStatus: orderStatus } = await getOrderStatus(config, {
    orderHash
  });

  console.log("Auction order status: ", orderStatus);
})();
