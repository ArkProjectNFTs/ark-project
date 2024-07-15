import { Config, createBroker } from "@ark-project/core";

import { nftContract } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { logger } from "./logger.js";
import { setArkFees } from "./setArkFees.js";
import { setCollectionCreatorFees } from "./setCollectionCreatorFees.js";

export async function setupFees(
  config: Config,
  accounts: Accounts
): Promise<void> {
  logger.info("Setting up fees...");

  await setArkFees(config, accounts.admin, config.starknetExecutorContract, 1);

  await createBroker(config, {
    brokenAccount: accounts.broker,
    numerator: 1,
    denominator: 100
  });

  await setCollectionCreatorFees(
    config,
    accounts.admin,
    accounts.arkReceiver.address,
    1,
    nftContract
  );

  logger.info("Fees setup complete.");
}
