import { createConfig } from "@ark-project/core";

import contracts from "../../../contracts.dev.json";

export { nftContract } from "../../../contracts.dev.json";

export const config = createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth,
  arkchainNetwork: "dev",
  arkchainOrderbookContract: contracts.orderbook
});
