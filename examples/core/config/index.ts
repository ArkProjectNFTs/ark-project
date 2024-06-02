import { createConfig } from "@ark-project/core";

import contracts from "../../../contracts.dev.json";

export { nftContract } from "../../../contracts.dev.json"

export const config = createConfig({
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth,
  arkchainOrderbookContract: contracts.orderbook
});
