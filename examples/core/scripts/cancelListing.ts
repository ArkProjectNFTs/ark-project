import "dotenv/config";

import {
  cancelOrder,
  Config,
  createBroker,
  createListing,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config, nftContract } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { logger } from "../utils/logger.js";
import { mintTokens } from "../utils/mintTokens.js";
import { setupAccounts } from "../utils/setupAccounts.js";

async function createAndCancelListing(
  config: Config,
  accounts: Accounts,
  order: ListingV1
): Promise<bigint> {
  logger.info("Creating listing...");
  const { orderHash } = await createListing(config, {
    starknetAccount: accounts.offerer,
    order,
    approveInfo: {
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId
    }
  });

  logger.info("Fetching order status after creation...");
  const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
    orderHash
  });
  logger.info("Order status before cancellation:", orderStatusBefore);

  logger.info("Cancelling listing order...");
  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  };

  await cancelOrder(config, {
    starknetAccount: accounts.offerer,
    cancelInfo
  });

  logger.info("Fetching order status after cancellation...");
  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });
  logger.info("Order status after cancellation:", orderStatusAfter);

  return orderHash;
}

async function main(): Promise<void> {
  logger.info("Starting the listing creation and cancellation process...");

  const accounts = await setupAccounts(config);
  await createBroker(config, {
    brokenAccount: accounts.broker_listing,
    numerator: 1,
    denominator: 100
  });

  const { tokenId, orderAmount } = await mintTokens(
    config,
    accounts,
    nftContract
  );

  const order: ListingV1 = {
    brokerId: accounts.broker_listing.address,
    tokenAddress: nftContract,
    tokenId: tokenId,
    startAmount: BigInt(orderAmount)
  };

  await createAndCancelListing(config, accounts, order);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
