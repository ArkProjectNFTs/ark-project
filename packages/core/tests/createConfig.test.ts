import { createConfig, networks } from "../src/index.js";

describe("createconfig", () => {
  test("default", async () => {
    const config = createConfig({
      starknetNetwork: networks.mainnet,
      arkchainNetwork: networks.mainnet
    });

    expect(config).toBeDefined();
  });

  test("error: missing dev starknetExecutorContract", async () => {
    expect(() => {
      createConfig({
        starknetNetwork: networks.dev,
        arkchainNetwork: networks.dev,
        arkchainOrderbookContract: "0x"
      });
    }).toThrow();
  });

  test("error: missing dev arkchainOrderbookContract", async () => {
    expect(() => {
      createConfig({
        starknetNetwork: networks.dev,
        arkchainNetwork: networks.dev,
        starknetExecutorContract: "0x"
      });
    }).toThrow();
  });
});
