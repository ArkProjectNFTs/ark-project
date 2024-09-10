import { getOrderStatus } from "../src/actions/read/index.js";
import { createListing, fulfillListing } from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("fulfillOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const startAmount = BigInt(1);

    const { orderHash } = await createListing(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount
      },
      approveInfo: {
        tokenAddress,
        tokenId
      }
    });

    await fulfillListing(config, {
      starknetAccount: buyer,
      fulfillListingInfo: {
        orderHash,
        tokenAddress,
        tokenId,
        brokerId: saleBroker.address
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 4_000));

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Executed");
  }, 50_000);
});
