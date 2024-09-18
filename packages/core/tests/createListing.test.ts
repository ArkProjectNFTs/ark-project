import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { createListing } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";

describe("createListing", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createListing(config, {
      account: seller,
      brokerAddress: accounts.listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(1)
    });
    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toBe("Open");
  }, 50_000);

  it("default: with custom currency", async () => {
    const { seller } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createListing(config, {
      account: seller,
      brokerAddress: accounts.listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(1)
    });
    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toBe("Open");
  }, 50_000);
});
