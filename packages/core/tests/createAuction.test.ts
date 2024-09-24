import { describe, expect, it } from "vitest";

import { accounts, config, mintERC721 } from "@ark-project/test";

import { createAuction, getOrderType } from "../src/index.js";
import { FEE_TOKEN, getTypeFromCairoCustomEnum } from "./utils/index.js";

describe("createAuction", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createAuction(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1),
      endAmount: BigInt(1)
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("default: with custom currency", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createAuction(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1),
      endAmount: BigInt(10),
      currencyAddress: FEE_TOKEN
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("error: invalid start date", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

    await expect(
      createAuction(config, {
        account: seller,
        brokerAddress: listingBroker.address,
        tokenAddress,
        tokenId,
        startDate: invalidStartDate,
        startAmount: BigInt(1),
        endAmount: BigInt(10)
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end date", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const invalidEndDate = Math.floor(Date.now() / 1000) - 30;

    await expect(
      createAuction(config, {
        account: seller,
        brokerAddress: listingBroker.address,
        tokenAddress,
        tokenId,
        endDate: invalidEndDate,
        startAmount: BigInt(1),
        endAmount: BigInt(10)
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end amount", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    await expect(
      createAuction(config, {
        account: seller,
        brokerAddress: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(2),
        endAmount: BigInt(1)
      })
    ).rejects.toThrow();
  }, 50_000);
});
