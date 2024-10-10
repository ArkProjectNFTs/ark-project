import { Account } from "starknet";
import { describe, expect, it } from "vitest";

import { config, getAccounts, mintERC721 } from "@ark-project/test";

import { getFeesAmount, setDefaultCreatorFees } from "../src/index.js";

describe("setDefaultCreatorFees", () => {
  it("default", async () => {
    const {
      admin,
      seller,
      listingBroker,
      saleBroker,
      arkSetbyAdminCollectionReceiver
    } = getAccounts();
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const amount = BigInt(10000);
    const numerator = 1;
    const denominator = 100;

    await setDefaultCreatorFees(config, {
      account: admin as Account,
      receiver: arkSetbyAdminCollectionReceiver.address,
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

    expect(fees.creator).toBe(
      (amount * BigInt(numerator)) / BigInt(denominator)
    );
  }, 50_000);

  it("error: invalid fees ratio", async () => {
    const { admin, arkSetbyAdminCollectionReceiver } = getAccounts();
    const numerator = 100;
    const denominator = 1;

    await expect(
      setDefaultCreatorFees(config, {
        account: admin as Account,
        receiver: arkSetbyAdminCollectionReceiver.address,
        numerator,
        denominator
      })
    ).rejects.toThrow();
  }, 50_000);
});
