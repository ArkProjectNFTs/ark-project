import { RpcProvider } from "starknet";

import { createConfig } from "../src/index.js";

// starknetNetwork?: Network;
// starknetCurrencyAddress?: string;
// arkchainNetwork: Network;
// arkchainRpcUrl?: string;
// arkchainAccountClassHash?: string;
// arkProvider?: ProviderInterface;
// starknetProvider: ProviderInterface;

describe("createconfig", () => {
  test("default", async () => {
    const config = createConfig({
      arkchainNetwork: "dev",
      starknetProvider: new RpcProvider({ nodeUrl: "http://localhost:3000" })
    });

    // expect(orderStatus).toBe("CancelledUser");
  });
});
