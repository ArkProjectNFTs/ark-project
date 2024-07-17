import { Config } from "@ark-project/core";

import { Accounts } from "../types/accounts.js";
import { getBalance } from "./getBalance.js";
import { logger } from "./logger.js";

export async function displayBalances(
  config: Config,
  accounts: Accounts,
  stage: string
): Promise<void> {
  logger.info(`Displaying balances ${stage}:`);

  for (const [name, account] of Object.entries(accounts)) {
    const balance = await getBalance(
      config,
      config.starknetCurrencyContract,
      account
    );
    logger.info(`${name} balance: ${balance}`);
  }
}
