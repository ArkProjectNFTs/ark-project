import { Account } from "starknet";
import { describe, expect, it } from "vitest";

import { config, getAccounts, mintERC721 } from "@ark-project/test";

import { NoABIError } from "../src/errors/actions.js";
import { getFeesAmount, setBrokerFees } from "../src/index.js";

describe("setBrokerFees", () => {
  it("default", async () => {
    const { seller, listingBroker, saleBroker } = getAccounts();
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const amount = BigInt(10000);
    const numerator = 1;
    const denominator = 100;

    const { abi } = await config.starknetProvider.getClassAt(
      config.starknetExecutorContract
    );

    if (abi === undefined) {
      throw new NoABIError({ docsPath: "" });
    }

    await setBrokerFees(config, {
      brokerAccount: listingBroker as Account,
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

    expect(fees.listingBroker).toBe(
      (amount * BigInt(numerator)) / BigInt(denominator)
    );
  }, 50_000);

  it("error: invalid fees ratio", async () => {
    const { listingBroker } = getAccounts();
    const numerator = 100;
    const denominator = 1;

    await expect(
      setBrokerFees(config, {
        brokerAccount: listingBroker as Account,
        numerator,
        denominator
      })
    ).rejects.toThrow();
  }, 50_000);
});
