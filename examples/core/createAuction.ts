import "dotenv/config";

import {
  AuctionV1,
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

async function createAuctionAndCheckStatus(
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

  logger.info("Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, { orderHash });
  logger.info("Auction order status:", orderStatus);
}

async function main(): Promise<void> {
  logger.info("Starting the auction creation process...");

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

  await createAuctionAndCheckStatus(config, accounts, tokenId, auction);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
