import { cancelOrder, createAuction } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("cancelAuction", () => {
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

    await cancelOrder(config, {
      starknetAccount: seller,
      cancelInfo: {
        orderHash: orderHash,
        tokenAddress,
        tokenId
      }
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("CancelledUser");
  }, 50_000);
});
