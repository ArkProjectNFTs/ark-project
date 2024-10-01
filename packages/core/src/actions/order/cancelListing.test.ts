import { cancelOrder, createListing } from "./index.js";
import { getOrderStatus } from "../read/index.js";
import {
  accounts,
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "../../../tests/utils/index.js";

describe("cancelListing", () => {
  it("default", async () => {
    const { seller, listingBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const orderHash = await createListing(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(1)
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    await cancelOrder(config, {
      starknetAccount: seller,
      cancelInfo: {
        orderHash,
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
