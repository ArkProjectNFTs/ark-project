import "dotenv/config";

import * as sn from "starknet";

import {
  Config,
  createOffer,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { Accounts } from "./types/accounts.js";
import { displayBalances } from "./utils/displayBalances.js";
import { logger } from "./utils/logger.js";
import { mintTokens } from "./utils/mintTokens.js";
import { setupAccounts } from "./utils/setupAccounts.js";
import { setupFees } from "./utils/setupFees.js";

async function createAndFulfillOffer(
  config: Config,
  accounts: Accounts,
  offer: OfferV1
): Promise<bigint> {
  logger.info("Creating offer...");
  const orderHash = await createOffer(config, {
    starknetAccount: accounts.offerer,
    offer,
    approveInfo: {
      currencyAddress: config.starknetCurrencyContract,
      amount: offer.startAmount
    }
  });

  if (config.starknetNetwork !== "dev") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  logger.info("Fulfilling offer...");
  const fulfillOfferInfo = {
    orderHash: orderHash,
    tokenAddress: offer.tokenAddress,
    tokenId: offer.tokenId,
    brokerId: offer.brokerId
  };

  await fulfillOffer(config, {
    starknetAccount: accounts.fulfiller,
    fulfillOfferInfo,
    approveInfo: {
      tokenAddress: nftContract as string,
      tokenId: offer.tokenId
    }
  });

  logger.info("Offer created and fulfilled.");
  return orderHash;
}

async function main(): Promise<void> {
  logger.info("Starting the offer creation and fulfillment process...");

  const accounts = await setupAccounts(config);
  await setupFees(config, accounts);

  const { tokenId, orderAmount } = await mintTokens(
    config,
    accounts,
    nftContract as string,
    true
  );

  const offer: OfferV1 = {
    brokerId: accounts.broker_listing.address,
    tokenAddress: nftContract as string,
    tokenId: tokenId,
    startAmount: orderAmount
  };

  await displayBalances(
    config,
    accounts,
    "before offer creation and fulfillment"
  );

  const orderHash = await createAndFulfillOffer(config, accounts, offer);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });
  logger.info("Order status after fulfillment:", orderStatusAfter);

  await displayBalances(
    config,
    accounts,
    "after offer creation and fulfillment"
  );
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
