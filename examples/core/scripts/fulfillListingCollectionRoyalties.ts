import "dotenv/config";

import {
  Config,
  createListing,
  fulfillListing,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config, contracts, isDev } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { displayBalances } from "../utils/displayBalances.js";
import { logger } from "../utils/logger.js";
import { mintTokens } from "../utils/mintTokens.js";
import { setupAccounts } from "../utils/setupAccounts.js";

async function createAndFulfillListing(
  config: Config,
  accounts: Accounts,
  order: ListingV1
): Promise<bigint> {
  logger.info("Creating listing...");
  const { orderHash } = await createListing(config, {
    account: accounts.offerer,
    ...order,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  });

  logger.info("Fulfilling listing...");

  const { transactionHash } = await fulfillListing(config, {
    account: accounts.fulfiller,
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId,
    brokerAddress: accounts.broker_sale.address,
    currencyAddress: config.starknetCurrencyContract,
    amount: order.amount,
    quantity: 1n
  });

  logger.info("Listing created and fulfilled.");
  logger.info("Order hash:", orderHash);
  logger.info(`https://sepolia.starkscan.co/tx/${transactionHash}`);
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
    brokerAddress: accounts.broker_listing.address,
    tokenAddress: contracts.nftContractFixedFees,
    tokenId: tokenId,
    amount: BigInt(orderAmount)
  };

  await displayBalances(config, accounts, "before sale");

  const orderHash = await createAndFulfillListing(config, accounts, order);

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
