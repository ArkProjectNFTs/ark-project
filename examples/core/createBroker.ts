import { createBroker } from "@ark-project/core";

import { config } from "./config/index.js";
import { setupAccounts } from "./utils/setupAccounts.js";

const accounts = await setupAccounts(config);
await createBroker(config, {
  brokenAccount: accounts.broker,
  numerator: 1,
  denominator: 100
});
