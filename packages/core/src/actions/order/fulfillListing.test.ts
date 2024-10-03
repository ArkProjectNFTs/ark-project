import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { createListing, fulfillListing } from "../../index.js";
import { getOrderStatus } from "../read/index.js";

describe("fulfillOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
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
      amount: startAmount
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Executed");
  }, 50_000);
});
