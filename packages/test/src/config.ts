import { createConfig } from "@ark-project/core";

import contracts from "../../../contracts.dev.json";

export default createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth
});
