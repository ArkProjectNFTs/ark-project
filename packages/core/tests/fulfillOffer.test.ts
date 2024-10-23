import { describe, expect, it } from "vitest";

import {
  config,
  getAccounts,
  getBalance,
  mintERC20,
  mintERC721
} from "@ark-project/test";

import { createOffer, fulfillOffer, getOrderStatus } from "../src/index.js";

describe("fulfillOffer", () => {
  it("default", async function () {
    const { seller, buyer, listingBroker, saleBroker } = getAccounts();
    const amount = BigInt(1000);
    await mintERC20({ account: buyer, amount: 100000 });
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });

    const { orderHash } = await createOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount
    });

    await fulfillOffer(config, {
      account: seller,
      brokerAddress: saleBroker.address,
      orderHash,
      tokenAddress,
      tokenId,
      quantity: BigInt(1),
    });

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    const sellerBalance = await getBalance({ account: seller });
    const fees = (BigInt(amount) * BigInt(1)) / BigInt(100);
    const profit = BigInt(amount) - fees;

    expect(orderStatusFulfilled).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + profit);
  }, 50_000);

  it("default: with custom fees", async function () {
    const { seller, buyer, listingBroker, saleBroker } = getAccounts();
    const amount = BigInt(1000);
    await mintERC20({ account: buyer, amount: 100000 });
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });

    const { orderHash } = await createOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount
    });

    await fulfillOffer(config, {
      account: seller,
      orderHash,
      tokenAddress,
      tokenId,
      quantity: BigInt(1),
      brokerAddress: saleBroker.address
    });

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    const sellerBalance = await getBalance({ account: seller });
    const fees = (BigInt(amount) * BigInt(1)) / BigInt(100);
    const profit = BigInt(amount) - fees;

    expect(orderStatusFulfilled).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + profit);
  }, 50_000);
});
