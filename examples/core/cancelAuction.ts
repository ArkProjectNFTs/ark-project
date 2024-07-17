import "dotenv/config";

import {
  AuctionV1,
  cancelOrder,
  Config,
  createAuction,
  createBroker,
  getOrderStatus
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { Accounts } from "./types/accounts.js";
import { logger } from "./utils/logger.js";
import { mintTokens } from "./utils/mintTokens.js";
import { setupAccounts } from "./utils/setupAccounts.js";

async function createAndCancelAuctionAndCheckStatus(
  config: Config,
  accounts: Accounts,
  tokenId: bigint,
  auction: AuctionV1
): Promise<void> {
  logger.info("Creating auction...");
  const orderHash = await createAuction(config, {
    starknetAccount: accounts.fulfiller,
    order: auction,
    approveInfo: {
      tokenAddress: nftContract,
      tokenId
    }
  });

  logger.info("Cancelling auction...");
  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: auction.tokenAddress,
    tokenId: auction.tokenId
  };

  await cancelOrder(config, {
    starknetAccount: accounts.fulfiller,
    cancelInfo
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  logger.info("Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, { orderHash });
  logger.info("Auction order status after cancellation:", orderStatus);
}

async function main(): Promise<void> {
  logger.info("Starting the auction creation and cancellation process...");

  const accounts = await setupAccounts(config);

  await createBroker(config, {
    brokenAccount: accounts.broker,
    numerator: 1,
    denominator: 100
  });

  logger.info("Minting tokens...");
  const { tokenId, orderAmount } = await mintTokens(
    config,
    accounts,
    nftContract,
    true
  );

  const auction: AuctionV1 = {
    brokerId: accounts.broker.address,
    tokenAddress: nftContract,
    tokenId,
    startAmount: BigInt(orderAmount),
    endAmount: BigInt(Number(orderAmount) * 2)
  };

  await createAndCancelAuctionAndCheckStatus(
    config,
    accounts,
    tokenId,
    auction
  );
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
