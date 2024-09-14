import { createBroker } from "@ark-project/core";

import { config } from "../config/index.js";
import { setupAccounts } from "../utils/setupAccounts.js";

const accounts = await setupAccounts(config);
const transactionHash = await createBroker(config, {
  brokenAccount: accounts.broker_listing,
  numerator: 1,
  denominator: 100
});
console.log("Broker created successfully");
console.log("Order hash:", transactionHash);
