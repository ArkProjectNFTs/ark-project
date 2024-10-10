import { describe, expect, it } from "vitest";

import {
  config,
  getAccounts,
  getBalance,
  mintERC20,
  mintERC721
} from "@ark-project/test";

import { fulfillAuction } from "../src/actions/order/fulfillAuction.js";
import { createAuction, createOffer } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";

describe("fulfillAuction", () => {
  it("default", async () => {
    const { seller, buyer, saleBroker, listingBroker } = getAccounts();
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });
    const amount = BigInt(1000);
    await mintERC20({ account: buyer, amount: 5000 });

    const { orderHash } = await createAuction(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1000)
    });

    const { orderHash: offerOrderHash } = await createOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount
    });

    await fulfillAuction(config, {
      account: buyer,
      brokerAddress: saleBroker.address,
      orderHash,
      relatedOrderHash: offerOrderHash,
      tokenAddress,
      tokenId
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    const sellerBalance = await getBalance({ account: seller });
    const fees = (BigInt(amount) * BigInt(1)) / BigInt(100);
    const profit = BigInt(amount) - fees;

    expect(orderStatus).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + profit);
  }, 50_000);
});
