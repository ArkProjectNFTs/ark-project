import "dotenv/config";

import {
  Config,
  createListing,
  fulfillListing,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config, contracts, isDev } from "./config/index.js";
import { Accounts } from "./types/accounts.js";
import { displayBalances } from "./utils/displayBalances.js";
import { logger } from "./utils/logger.js";
import { mintTokens } from "./utils/mintTokens.js";
import { setupAccounts } from "./utils/setupAccounts.js";

async function createAndFulfillListing(
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

  await new Promise((resolve) => setTimeout(resolve, 2000));

  logger.info("Fulfilling listing...");
  const fulfillListingInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId,
    brokerId: accounts.broker_sale.address
  };

  await fulfillListing(config, {
    starknetAccount: accounts.fulfiller,
    fulfillListingInfo,
    approveInfo: {
      currencyAddress: config.starknetCurrencyContract,
      amount: order.startAmount
    }
  });

  logger.info("Listing created and fulfilled.");
  return orderHash;
}

async function main(): Promise<void> {
  logger.info("Starting the listing process...");

  const accounts = await setupAccounts(config);

  const { tokenId, orderAmount } = await mintTokens(
    config,
    accounts,
    contracts.nftContractFixedFees
  );

  const order: ListingV1 = {
    brokerId: accounts.broker_listing.address,
    tokenAddress: contracts.nftContractFixedFees,
    tokenId: tokenId,
    startAmount: BigInt(orderAmount)
  };

  await displayBalances(config, accounts, "before sale");

  const orderHash = await createAndFulfillListing(config, accounts, order);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });

  logger.info("Order status after fulfillment:", orderStatusAfter);

  await displayBalances(config, accounts, "after sale");
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
