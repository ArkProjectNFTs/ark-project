import { AuctionV1, createAuction, getOrderType } from "../src/index.js";
import {
  accounts,
  config,
  getTypeFromCairoCustomEnum,
  mintERC721
} from "./utils/index.js";

describe("createAuction", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const orderHash = await createAuction(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(1),
        endAmount: BigInt(10)
      },
      approveInfo: {
        tokenAddress,
        tokenId
      }
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("default: with custom currency", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const orderHash = await createAuction(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(1),
        endAmount: BigInt(10),
        currencyAddress:
          "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
      },
      approveInfo: {
        tokenAddress,
        tokenId
      }
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("error: invalid start date", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress,
      tokenId,
      startDate: invalidStartDate,
      startAmount: BigInt(1),
      endAmount: BigInt(10)
    };

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        order,
        approveInfo: {
          tokenAddress,
          tokenId
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end date", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const invalidEndDate = Math.floor(Date.now() / 1000) - 30;

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress,
      tokenId,
      endDate: invalidEndDate,
      startAmount: BigInt(1),
      endAmount: BigInt(10)
    };

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end amount", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1),
      endAmount: BigInt(0)
    };

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);
});
