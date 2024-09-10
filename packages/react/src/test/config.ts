import { createConfig } from "@ark-project/core";

import contracts from "../../../../contracts.dev.json";

export { contracts };

export const config = createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth
});
