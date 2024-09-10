import { createOffer, getOrderStatus } from "../src/index.js";
import {
  accounts,
  config,
  FEE_TOKEN,
  mintERC20,
  mintERC721
} from "./utils/index.js";

describe("createOffer", () => {
  it("default", async () => {
    const { seller, buyer } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 10000000 });

    const { orderHash } = await createOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(10)
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: BigInt(10)
      }
    });

    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatusAfter).toBe("Open");
  }, 50_000);

  // it("default: custom currency", async () => {
  //   const { seller, buyer } = accounts;
  //   const tokenId = await mintERC721({ account: seller });
  //   await mintERC20({ account: buyer, amount: 1000 });

  //   const orderHash = await createOffer(config, {
  //     starknetAccount: buyer,
  //     offer: {
  //       brokerId: accounts.listingBroker.address,
  //       tokenAddress: STARKNET_NFT_ADDRESS,
  //       tokenId,
  //       startAmount: BigInt(10),
  //       currencyAddress:
  //         "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
  //     },
  //     approveInfo: {
  //       currencyAddress:
  //         "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  //       amount: BigInt(10)
  //     }
  //   });

  //   const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
  //     orderHash
  //   });

  //   expect(orderStatusAfter).toBe("Open");
  // }, 50_000);

  it("error: invalid currency address", async () => {
    const { seller, buyer } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 1 });

    await expect(
      createOffer(config, {
        starknetAccount: buyer,
        offer: {
          brokerId: accounts.listingBroker.address,
          tokenAddress,
          tokenId,
          startAmount: BigInt(10),
          currencyAddress: FEE_TOKEN
        },
        approveInfo: {
          currencyAddress: config.starknetCurrencyContract,
          amount: BigInt(10)
        }
      })
    ).rejects.toThrow();
  }, 50_000);
});
