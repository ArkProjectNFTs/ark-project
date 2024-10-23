import { describe, expect, it } from "vitest";

import { config, getAccounts, mintERC721 } from "@ark-project/test";

import { getOrderStatus } from "../src/actions/read/index.js";
import { createListing, fulfillListing } from "../src/index.js";

describe("fulfillOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = getAccounts();
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const startAmount = BigInt(1);

    const { orderHash } = await createListing(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount: startAmount
    });

    await fulfillListing(config, {
      account: buyer,
      brokerAddress: saleBroker.address,
      orderHash,
      tokenAddress,
      tokenId,
      quantity: BigInt(1),
      amount: startAmount
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Executed");
  }, 50_000);
});
