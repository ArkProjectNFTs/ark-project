import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { cancelOrder, createListing } from "./index.js";
import { getOrderStatus } from "../read/index.js";

describe("cancelListing", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createListing(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(1)
    });

    await cancelOrder(config, {
      account: seller,
      orderHash,
      tokenAddress,
      tokenId
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("CancelledUser");
  }, 50_000);
});
