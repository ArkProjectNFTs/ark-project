import { getOrderStatus } from "../src/actions/read/index.js";
import { createListing, fulfillListing } from "../src/index.js";
import {
  accounts,
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("fulfillOffer", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });
    const startAmount = BigInt(1);

    const orderHash = await createListing(config, {
      starknetAccount: seller,
      order: {
        brokerId: listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    await fulfillListing(config, {
      starknetAccount: buyer,
      fulfillListingInfo: {
        orderHash,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        brokerId: saleBroker.address
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Executed");
  }, 50_000);
});
