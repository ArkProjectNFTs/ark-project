import "dotenv/config";

import * as sn from "starknet";

import {
  AuctionV1,
  Config,
  createAuction,
  createBroker,
  createOffer,
  fulfillAuction,
  FulfillAuctionInfo,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { Accounts } from "./types/accounts.js";
import { logger } from "./utils/logger.js";
import { mintTokens } from "./utils/mintTokens.js";
import { setupAccounts } from "./utils/setupAccounts.js";

async function createAndFulfillAuction(
  config: Config,
  accounts: Accounts,
  tokenId: bigint
): Promise<void> {
  const brokerId = accounts.broker.address;

  // Create auction
  const auction: AuctionV1 = {
    brokerId,
    tokenAddress: nftContract,
    tokenId,
    startAmount: BigInt(1),
    endAmount: BigInt(10)
  };

  logger.info("Creating auction...");
  const auctionOrderHash = await createAuction(config, {
    starknetAccount: accounts.fulfiller,
    order: auction,
    approveInfo: {
      tokenAddress: nftContract,
      tokenId
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Create offer
  const offer: OfferV1 = {
    brokerId,
    tokenAddress: nftContract,
    tokenId,
    startAmount: BigInt(1)
  };

  logger.info("Creating offer...");
  const offerOrderHash = await createOffer(config, {
    starknetAccount: accounts.offerer,
    offer,
    approveInfo: {
      currencyAddress: config.starknetCurrencyContract,
      amount: offer.startAmount
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Fulfill auction
  const fulfillAuctionInfo: FulfillAuctionInfo = {
    orderHash: auctionOrderHash,
    relatedOrderHash: offerOrderHash,
    tokenAddress: auction.tokenAddress,
    tokenId,
    brokerId
  };

  logger.info("Fulfilling auction...");
  await fulfillAuction(config, {
    starknetAccount: accounts.fulfiller,
    fulfillAuctionInfo
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { orderStatus } = await getOrderStatus(config, {
    orderHash: auctionOrderHash
  });
  logger.info("Auction order status:", orderStatus);
}

async function main(): Promise<void> {
  logger.info(
    "Starting the auction creation, offer, and fulfillment process..."
  );

  const accounts = await setupAccounts(config);

  await createBroker(config, {
    brokenAccount: accounts.broker,
    numerator: 1,
    denominator: 100
  });

  logger.info("Minting tokens...");
  const { tokenId } = await mintTokens(config, accounts, nftContract, true);

  await createAndFulfillAuction(config, accounts, tokenId);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
