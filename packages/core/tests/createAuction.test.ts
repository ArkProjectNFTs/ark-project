import { createAuction, getOrderType } from "../src/index.js";
import {
  accounts,
  config,
  FEE_TOKEN,
  getTypeFromCairoCustomEnum,
  mintERC721
} from "./utils/index.js";

describe("createAuction", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { orderHash } = await createAuction(config, {
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

    const { orderHash } = await createAuction(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(1),
        endAmount: BigInt(10),
        currencyAddress: FEE_TOKEN
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

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        order: {
          brokerId: listingBroker.address,
          tokenAddress,
          tokenId,
          startDate: invalidStartDate,
          startAmount: BigInt(1),
          endAmount: BigInt(10)
        },
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

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress,
          tokenId
        },
        order: {
          brokerId: listingBroker.address,
          tokenAddress,
          tokenId,
          endDate: invalidEndDate,
          startAmount: BigInt(1),
          endAmount: BigInt(10)
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end amount", async () => {
    const { seller, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    await expect(
      createAuction(config, {
        starknetAccount: seller,
        approveInfo: {
          tokenAddress,
          tokenId
        },
        order: {
          brokerId: listingBroker.address,
          tokenAddress,
          tokenId,
          startAmount: BigInt(1),
          endAmount: BigInt(0)
        }
      })
    ).rejects.toThrow();
  }, 50_000);
});
