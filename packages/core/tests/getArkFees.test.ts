import { describe, expect, it } from "vitest";

import { config } from "@ark-project/test";

import { getArkFees } from "../src/index.js";

describe("getArkFees", () => {
  it("default", async () => {
    const fees = await getArkFees(config);

    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
