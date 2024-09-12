import {
  cancelCollectionOffer,
  createCollectionOffer,
  getOrderStatus
} from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("cancelCollectionOffer", () => {
  it("default", async () => {
    const { buyer, listingBroker } = accounts;
    const { tokenAddress } = await mintERC721({ account: buyer });

    const { orderHash } = await createCollectionOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: listingBroker.address,
        tokenAddress,
        startAmount: BigInt(10)
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: BigInt(10)
      }
    });

    await cancelCollectionOffer(config, {
      starknetAccount: buyer,
      cancelInfo: {
        orderHash,
        tokenAddress
      }
    });

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toEqual("CancelledUser");
  }, 50_000);
});
