import contracts from "../../../contracts.dev.json";
import { createConfig } from "../../core/src/createConfig.js";

const config = createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth
});

export { config };
