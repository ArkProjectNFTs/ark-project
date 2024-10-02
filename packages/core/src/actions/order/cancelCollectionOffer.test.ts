import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import {
  cancelCollectionOffer,
  createCollectionOffer,
  getOrderStatus
} from "../../index.js";

describe("cancelCollectionOffer", () => {
  it("default", async () => {
    const { buyer, listingBroker } = accounts;
    const { tokenAddress } = await mintERC721({ account: buyer });

    const { orderHash } = await createCollectionOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      amount: BigInt(10)
    });

    await cancelCollectionOffer(config, {
      starknetAccount: buyer,
      cancelInfo: {
        orderHash,
        tokenAddress
      }
    });

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toEqual("CancelledUser");
  }, 50_000);
});
