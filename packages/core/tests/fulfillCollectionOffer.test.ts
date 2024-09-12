import {
  createCollectionOffer,
  fulfillCollectionOffer,
  getOrderStatus
} from "../src/index.js";
import { accounts, config, mintERC20, mintERC721 } from "./utils/index.js";

describe("fulfillCollectionOffer", () => {
  it("default", async function () {
    const { buyer, seller, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 100000 });
    const startAmount = BigInt(1000);

    const { orderHash } = await createCollectionOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: listingBroker.address,
        tokenAddress,
        startAmount
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: startAmount
      }
    });

    await fulfillCollectionOffer(config, {
      starknetAccount: seller,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress,
        tokenId,
        brokerId: saleBroker.address
      },
      approveInfo: {
        tokenAddress,
        tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatusFulfilled).toBe("Executed");
  }, 50_000);
});
