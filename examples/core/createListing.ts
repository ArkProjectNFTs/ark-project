import "dotenv/config";

import {
  Config,
  createBroker,
  createListing,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { Accounts } from "./types/accounts.js";
import { getTokenOwner } from "./utils/getTokenOwner.js";
import { logger } from "./utils/logger.js";
import { mintTokens } from "./utils/mintTokens.js";
import { setupAccounts } from "./utils/setupAccounts.js";

async function createListingAndCheckStatus(
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
  logger.info("Order hash:", orderHash);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  logger.info("Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, { orderHash });
  logger.info("Order status:", orderStatus);

  return orderHash;
}

async function main(): Promise<void> {
  logger.info("Starting the listing creation and status check process...");

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

  const owner = await getTokenOwner(config, nftContract, tokenId);
  const ownerHex = "0x" + owner.toString(16).padStart(64, "0");
  logger.info(`Owner of tokenId ${tokenId} is ${ownerHex}`);

  const order: ListingV1 = {
    brokerId: accounts.broker_listing.address,
    tokenAddress: nftContract,
    tokenId: tokenId,
    startAmount: BigInt(orderAmount)
  };

  await createListingAndCheckStatus(config, accounts, order);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
