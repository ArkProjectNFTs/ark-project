import { cancelOrder, createAuction } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import {
  accounts,
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("cancelAuction", () => {
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

    await cancelOrder(config, {
      starknetAccount: seller,
      cancelInfo: {
        orderHash: orderHash,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("CancelledUser");
  }, 50_000);
});
