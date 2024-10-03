import { describe, expect, it } from "vitest";

import { accounts, config } from "@ark-project/test";

import { getBrokerFees } from "../../index.js";

describe("getBrokerFees", () => {
  it("default", async () => {
    const { listingBroker } = accounts;
    const fees = await getBrokerFees(config, listingBroker.address);

    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
