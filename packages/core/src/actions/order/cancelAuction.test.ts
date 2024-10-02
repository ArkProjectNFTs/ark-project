import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { cancelOrder, createAuction } from "./index.js";
import { getOrderStatus } from "../read/index.js";

describe("cancelAuction", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createAuction(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1)
    });

    await cancelOrder(config, {
      account: seller,
      orderHash: orderHash,
      tokenAddress,
      tokenId
    });

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toBe("CancelledUser");
  }, 50_000);
});
