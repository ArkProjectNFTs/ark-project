import { type Config, fetchOrCreateAccount } from "@ark-project/core";

import type { Accounts } from "../types/accounts.js";
import { logger } from "./logger.js";

export async function setupAccounts(config: Config): Promise<Accounts> {
  logger.info("Setting up accounts...");

  const arkDefaultFeesReceiver = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_RECEIVER_PRIVATE_KEY!
  );

  const arkSetbyAdminCollectionReceiver = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_COLLECTION_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_COLLECTION_RECEIVER_PRIVATE_KEY!
  );

  const arkCollection2981Receiver = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_PRIVATE_KEY!
  );

  const admin = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ADMIN_ADDRESS!,
    process.env.STARKNET_ADMIN_PRIVATE_KEY!
  );

  const broker_listing = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_ADDRESS!,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_PRIVATE_KEY!
  );

  const broker_sale = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_SALE_BROKER_ACCOUNT_ADDRESS!,
    process.env.STARKNET_SALE_BROKER_ACCOUNT_PRIVATE_KEY!
  );

  const offerer = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS!,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY!
  );

  const fulfiller = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS!,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY!
  );

  logger.info("Accounts setup complete.");

  return {
    arkDefaultFeesReceiver,
    admin,
    broker_listing,
    broker_sale,
    offerer,
    fulfiller,
    arkSetbyAdminCollectionReceiver,
    arkCollection2981Receiver
  };
}
