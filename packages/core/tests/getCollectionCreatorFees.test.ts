import { describe, expect, it } from "vitest";

import { config, getAccounts, mintERC721 } from "@ark-project/test";

import { getCollectionCreatorFees } from "../src/index.js";

describe("getCollectionCreatorFees", () => {
  it("default", async () => {
    const { seller } = getAccounts();
    const { tokenAddress } = await mintERC721({ account: seller });

    const { creator, fees } = await getCollectionCreatorFees(
      config,
      tokenAddress
    );

    expect(creator).toBeDefined();
    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
