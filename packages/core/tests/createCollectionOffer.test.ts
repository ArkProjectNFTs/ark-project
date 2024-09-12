import {
  createCollectionOffer,
  getOrderStatus,
  getOrderType
} from "../src/index.js";
import {
  accounts,
  config,
  getTypeFromCairoCustomEnum,
  mintERC20,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("createCollectionOffer", () => {
  it("default", async () => {
    const { buyer, listingBroker } = accounts;
    await mintERC20({ account: buyer, amount: 10000000 });

    const { orderHash } = await createCollectionOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        startAmount: BigInt(10)
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: BigInt(10)
      }
    });
    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);
    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderType).toBe("COLLECTION_OFFER");
    expect(orderStatusAfter).toBe("Open");
  }, 50_000);

  it("error: invalid start date", async () => {
    const { buyer, listingBroker } = accounts;
    await mintERC20({ account: buyer, amount: 10000000 });

    await expect(
      createCollectionOffer(config, {
        starknetAccount: buyer,
        offer: {
          brokerId: listingBroker.address,
          tokenAddress: STARKNET_NFT_ADDRESS,
          startAmount: BigInt(10),
          startDate: Math.floor(Date.now() / 1000) - 1000
        },
        approveInfo: {
          currencyAddress: config.starknetCurrencyContract,
          amount: BigInt(10)
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid start date / end date", async () => {
    const { buyer, listingBroker } = accounts;
    await mintERC20({ account: buyer, amount: 10000000 });

    await expect(
      createCollectionOffer(config, {
        starknetAccount: buyer,
        offer: {
          brokerId: listingBroker.address,
          tokenAddress: STARKNET_NFT_ADDRESS,
          startAmount: BigInt(10),
          startDate: Math.floor(Date.now() / 1000) + 1000,
          endDate: Math.floor(Date.now() / 1000) + 500
        },
        approveInfo: {
          currencyAddress: config.starknetCurrencyContract,
          amount: BigInt(10)
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end date", async () => {
    const { buyer, listingBroker } = accounts;
    await mintERC20({ account: buyer, amount: 10000000 });

    await expect(
      createCollectionOffer(config, {
        starknetAccount: buyer,
        offer: {
          brokerId: listingBroker.address,
          tokenAddress: STARKNET_NFT_ADDRESS,
          startAmount: BigInt(10),
          endDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 + 1
        },
        approveInfo: {
          currencyAddress: config.starknetCurrencyContract,
          amount: BigInt(10)
        }
      })
    ).rejects.toThrow();
  }, 50_000);
});
