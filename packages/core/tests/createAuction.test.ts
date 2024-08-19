import { AuctionV1, createAuction, getOrderType } from "../src/index.js";
import {
  accounts,
  config,
  getTypeFromCairoCustomEnum,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("createAuction", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const orderHash = await createAuction(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(1),
        endAmount: BigInt(10)
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("error: invalid start date", async () => {
    const { seller, listingBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress: STARKNET_NFT_ADDRESS,
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
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end date", async () => {
    const { seller, listingBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const invalidEndDate = Math.floor(Date.now() / 1000) - 30;

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      endDate: invalidEndDate,
      startAmount: BigInt(1),
      endAmount: BigInt(10)
    };

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end amount", async () => {
    const { seller, listingBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const order: AuctionV1 = {
      brokerId: listingBroker.address,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: BigInt(1),
      endAmount: BigInt(0)
    };

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);
});
