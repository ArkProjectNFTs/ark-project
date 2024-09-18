import { describe, expect } from "vitest";

import { createConfig, networks } from "../src/index.js";

describe("createconfig", () => {
  test("default", async () => {
    const config = createConfig({
      starknetNetwork: networks.mainnet
    });

    expect(config).toBeDefined();
  });

  test("error: missing dev starknetExecutorContract", async () => {
    expect(() => {
      createConfig({
        starknetNetwork: networks.dev
      });
    }).toThrow();
  });
});
