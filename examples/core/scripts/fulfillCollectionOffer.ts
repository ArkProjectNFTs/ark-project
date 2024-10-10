import "dotenv/config";

import {
  Config,
  createOffer,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config, nftContract } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { displayBalances } from "../utils/displayBalances.js";
import { logger } from "../utils/logger.js";
import { mintTokens } from "../utils/mintTokens.js";
import { setupAccounts } from "../utils/setupAccounts.js";

async function createAndFulfillCollectionOffer(
  config: Config,
  accounts: Accounts,
  offer: OfferV1,
  tokenId: bigint
): Promise<bigint> {
  logger.info("Creating collection offer...");
  const { orderHash } = await createOffer(config, {
    account: accounts.offerer,
    ...offer,
    currencyAddress: config.starknetCurrencyContract,
    amount: offer.amount
  });

  logger.info("Fulfilling collection offer...");

  const { transactionHash } = await fulfillOffer(config, {
    account: accounts.fulfiller,
    orderHash: orderHash,
    tokenAddress: offer.tokenAddress,
    tokenId: tokenId,
    brokerAddress: offer.brokerAddress
  });

  logger.info("Collection offer created and fulfilled.");
  logger.info("Order hash:", orderHash);
  logger.info(`https://sepolia.starkscan.co/tx/${transactionHash}`);
  return orderHash;
}

async function main(): Promise<void> {
  logger.info(
    "Starting the collection offer creation and fulfillment process..."
  );

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
    amount: orderAmount
  };

  await displayBalances(
    config,
    accounts,
    "before collection offer creation and fulfillment"
  );

  const orderHash = await createAndFulfillCollectionOffer(
    config,
    accounts,
    offer,
    tokenId
  );

  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });
  logger.info("Order status after fulfillment:", orderStatusAfter);

  await displayBalances(
    config,
    accounts,
    "after collection offer creation and fulfillment"
  );
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
