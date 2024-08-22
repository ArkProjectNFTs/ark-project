import {
  createOffer,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src/index.js";
import {
  accounts,
  config,
  getBalance,
  mintERC20,
  mintERC721
} from "./utils/index.js";

describe("fulfillOffer", () => {
  it("default", async function () {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
    await mintERC20({ account: buyer, amount: 100000 });
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });

    const offer: OfferV1 = {
      brokerId: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(10)
    };

    const { orderHash } = await createOffer(config, {
      starknetAccount: buyer,
      offer,
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: offer.startAmount
      }
    });

    await fulfillOffer(config, {
      starknetAccount: seller,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId,
        brokerId: saleBroker.address
      },
      approveInfo: {
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 4_000));

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    const balance = await getBalance({ account: seller });
    const fees =
      (BigInt(offer.startAmount) *
        (BigInt(100) + BigInt(100) + BigInt(100) + BigInt(100))) /
      BigInt(10000);
    const profit = BigInt(offer.startAmount) - fees;

    expect(orderStatusFulfilled).toBe("Executed");
    expect(balance).toEqual(initialSellerBalance + profit);
  }, 50_000);

  it("default: with custom fees", async function () {
    const { seller, buyer, listingBroker, saleBroker } = accounts;

    await mintERC20({ account: buyer, amount: 100000 });
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });

    const offer: OfferV1 = {
      brokerId: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(10)
    };

    const { orderHash } = await createOffer(config, {
      starknetAccount: buyer,
      offer,
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: offer.startAmount
      }
    });

    await fulfillOffer(config, {
      starknetAccount: seller,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId,
        brokerId: saleBroker.address
      },
      approveInfo: {
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 4_000));

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    const balance = await getBalance({ account: seller });
    const fees =
      (BigInt(offer.startAmount) *
        (BigInt(100) + BigInt(100) + BigInt(100) + BigInt(100))) /
      BigInt(10000);
    const profit = BigInt(offer.startAmount) - fees;

    expect(orderStatusFulfilled).toBe("Executed");
    expect(balance).toEqual(initialSellerBalance + profit);
  }, 50_000);
});
