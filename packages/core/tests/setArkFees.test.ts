import { Account } from "starknet";
import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { getFeesAmount, setArkFees } from "../src/index.js";

describe("setArkFees", () => {
  it("default", async () => {
    const { admin, seller, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const amount = BigInt(10000);
    const numerator = 1;
    const denominator = 100;

    await setArkFees(config, {
      account: admin as Account,
      numerator,
      denominator
    });

    const fees = await getFeesAmount(config, {
      fulfillBroker: saleBroker.address,
      listingBroker: listingBroker.address,
      nftAddress: tokenAddress,
      nftTokenId: tokenId,
      paymentAmount: amount
    });

    expect(fees.ark).toBe((amount * BigInt(numerator)) / BigInt(denominator));
  }, 50_000);

  it("error: invalid fees ratio", async () => {
    const { admin } = accounts;
    const numerator = 100;
    const denominator = 1;

    await expect(
      setArkFees(config, {
        account: admin as Account,
        numerator,
        denominator
      })
    ).rejects.toThrow();
  }, 50_000);
});
