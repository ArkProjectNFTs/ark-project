import { Config, createBroker } from "@ark-project/core";

import { contracts, isDev } from "../config/index.js";
import { Accounts } from "../types/accounts.js";
import { logger } from "./logger.js";
import { setArkFees } from "./setArkFees.js";
import { setCollectionCreatorFees } from "./setCollectionCreatorFees.js";
import { setDefaultCreatorFees } from "./setDefaultCreatorFees.js";

export async function setupFees(
  config: Config,
  accounts: Accounts
): Promise<void> {
  logger.info("Setting up fees...");

  await setArkFees(config, accounts.admin, config.starknetExecutorContract, 25);

  await createBroker(config, {
    brokenAccount: accounts.broker_listing,
    numerator: 50,
    denominator: 10000
  });

  await createBroker(config, {
    brokenAccount: accounts.broker_sale,
    numerator: 50,
    denominator: 10000
  });

  await setCollectionCreatorFees(
    config,
    accounts.admin,
    accounts.arkSetbyAdminCollectionReceiver.address,
    50,
    contracts.nftContractFixedFees
  );

  await setDefaultCreatorFees(
    config,
    accounts.admin,
    accounts.arkDefaultFeesReceiver.address,
    50
  );

  logger.info("Fees setup complete.");
}
