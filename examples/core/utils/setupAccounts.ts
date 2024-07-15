import { Config, fetchOrCreateAccount } from "@ark-project/core";

import { Accounts } from "../types/accounts.js";
import { logger } from "./logger.js";

export async function setupAccounts(config: Config): Promise<Accounts> {
  logger.info("Setting up accounts...");

  const arkReceiver = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_RECEIVER_PRIVATE_KEY!
  );

  const admin = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ADMIN_ADDRESS!,
    process.env.STARKNET_ADMIN_PRIVATE_KEY!
  );

  const broker = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_ADDRESS!,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_PRIVATE_KEY!
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

  return { arkReceiver, admin, broker, offerer, fulfiller };
}
