import "dotenv/config";

import {
  Config,
  createOffer,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config, nftContract } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { logger } from "../utils/logger.js";
import { mintTokens } from "../utils/mintTokens.js";
import { setupAccounts } from "../utils/setupAccounts.js";

async function createOfferAndCheckStatus(
  config: Config,
  accounts: Accounts,
  offer: OfferV1
): Promise<bigint> {
  logger.info("Creating offer...");
  const { orderHash } = await createOffer(config, {
    account: accounts.offerer,
    ...offer,
    currencyAddress: config.starknetCurrencyContract,
    amount: offer.amount
  });
  logger.info("Order hash:", orderHash);
  logger.info("Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, { orderHash });
  logger.info("Order status:", orderStatus);

  return orderHash;
}

async function main(): Promise<void> {
  logger.info("Starting the offer creation and status check process...");
  const accounts = await setupAccounts(config);
  const { tokenId, orderAmount } = await mintTokens(
    config,
    accounts,
    nftContract as string,
    true
  );
  const offer: OfferV1 = {
    brokerAddress: accounts.broker_listing.address,
    tokenAddress: nftContract as string,
    tokenId: tokenId,
    amount: orderAmount,
    currencyAddress: config.starknetCurrencyContract
  };

  await createOfferAndCheckStatus(config, accounts, offer);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
