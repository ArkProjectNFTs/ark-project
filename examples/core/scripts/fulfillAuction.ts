import "dotenv/config";

import {
  AuctionV1,
  Config,
  createAuction,
  createOffer,
  fulfillAuction,
  FulfillAuctionInfo,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config, nftContract } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { displayBalances } from "../utils/displayBalances.js";
import { logger } from "../utils/logger.js";
import { mintTokens } from "../utils/mintTokens.js";
import { setupAccounts } from "../utils/setupAccounts.js";

async function createAndFulfillAuction(
  config: Config,
  accounts: Accounts,
  tokenId: bigint
): Promise<bigint> {
  const brokerAddressListing = accounts.broker_listing.address;
  const brokerAddressSale = accounts.broker_sale.address;

  // Create auction
  const auction: AuctionV1 = {
    brokerAddress: brokerAddressListing,
    tokenAddress: nftContract as string,
    tokenId,
    startAmount: BigInt(1000000000000000),
    endAmount: BigInt(10000000000000000)
  };

  logger.info("Creating auction...");
  const { orderHash: auctionOrderHash } = await createAuction(config, {
    account: accounts.fulfiller,
    ...auction,
    tokenAddress: nftContract as string,
    tokenId
  });

  // Create offer
  const offer: OfferV1 = {
    brokerAddress: brokerAddressSale,
    tokenAddress: nftContract as string,
    tokenId,
    amount: BigInt(10000000000000000)
  };

  logger.info("Creating offer...");
  const { orderHash: offerOrderHash } = await createOffer(config, {
    account: accounts.offerer,
    ...offer,
    currencyAddress: config.starknetCurrencyContract,
    amount: offer.amount
  });

  // Fulfill auction
  const fulfillAuctionInfo: FulfillAuctionInfo = {
    orderHash: auctionOrderHash,
    relatedOrderHash: offerOrderHash,
    tokenAddress: auction.tokenAddress,
    tokenId,
    brokerAddress: brokerAddressSale
  };

  logger.info("Fulfilling auction...");
  const { transactionHash } = await fulfillAuction(config, {
    account: accounts.fulfiller,
    ...fulfillAuctionInfo
  });

  logger.info("Auction fulfilled.");
  logger.info(`https://sepolia.starkscan.co/tx/${transactionHash}`);
  return auctionOrderHash;
}

async function main(): Promise<void> {
  logger.info(
    "Starting the auction creation, offer, and fulfillment process..."
  );

  const accounts = await setupAccounts(config);

  logger.info("Minting tokens...");
  const { tokenId } = await mintTokens(
    config,
    accounts,
    nftContract as string,
    true
  );

  await displayBalances(
    config,
    accounts,
    "before collection offer creation and fulfillment"
  );

  const orderHash = await createAndFulfillAuction(config, accounts, tokenId);

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
