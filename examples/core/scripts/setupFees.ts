import "dotenv/config";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { setupAccounts } from "../utils/setupAccounts.js";
import { setupFees } from "../utils/setupFees.js";

async function main(): Promise<void> {
  logger.info("Starting the listing process...");

  const accounts = await setupAccounts(config);
  await setupFees(config, accounts);
}

main().catch((error) => {
  logger.error("An error occurred:", error);
  process.exit(1);
});
