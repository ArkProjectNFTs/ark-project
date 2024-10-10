import { describe, expect, it } from "vitest";

import { config, getAccounts, mintERC20, mintERC721 } from "@ark-project/test";

import { cancelOrder, createOffer, getOrderStatus } from "../src/index.js";

describe("cancelOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker } = getAccounts();
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 1000 });

    const { orderHash } = await createOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(10)
    });

    await cancelOrder(config, {
      account: buyer,
      orderHash,
      tokenAddress,
      tokenId
    });

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toEqual("CancelledUser");
  }, 50_000);
});
