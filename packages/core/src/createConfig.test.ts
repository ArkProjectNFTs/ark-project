import { describe, expect, it } from "vitest";

import { createConfig, networks } from "./index.js";

describe("createconfig", () => {
  it("default", async () => {
    const config = createConfig({
      starknetNetwork: networks.mainnet
    });

    expect(config).toBeDefined();
  });

  it("error: missing dev starknetExecutorContract", async () => {
    expect(() => {
      createConfig({
        starknetNetwork: networks.dev
      });
    }).toThrow();
  });
});
