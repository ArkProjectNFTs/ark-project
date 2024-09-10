import { cancelOrder, createOffer, getOrderStatus } from "../src/index.js";
import { accounts, config, mintERC20, mintERC721 } from "./utils/index.js";

describe("cancelOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 1000 });

    const { orderHash } = await createOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(10)
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: BigInt(10)
      }
    });

    await cancelOrder(config, {
      starknetAccount: buyer,
      cancelInfo: {
        orderHash,
        tokenAddress,
        tokenId
      }
    });

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toEqual("CancelledUser");
  }, 50_000);
});
