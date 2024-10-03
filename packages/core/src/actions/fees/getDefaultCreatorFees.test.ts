import { describe, expect, it } from "vitest";

import { config } from "@ark-project/test";

import { getDefaultCreatorFees } from "../../index.js";

describe("getDefaultCreatorFees", () => {
  it("default", async () => {
    const { creator, fees } = await getDefaultCreatorFees(config);

    expect(creator).toBeDefined();
    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
