import { stark } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import {
  createBroker,
  createListing,
  fulfillListing,
  ListingV1
} from "../src/index.js";
import {
  config,
  mintERC721,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("fulfillListing", () => {
  it("default", async () => {
    const adminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS,
      process.env.SOLIS_ADMIN_PRIVATE_KEY
    );
    const sellerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );
    const buyerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    const brokerId = stark.randomAddress();
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const tokenId = await mintERC721({ account: sellerAccount });

    const order: ListingV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1
    };

    const orderHash = await createListing(config, {
      starknetAccount: sellerAccount,
      order,
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const fulfillListingInfo = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId,
      brokerId
    };

    await fulfillListing(config, {
      starknetAccount: buyerAccount,
      fulfillListingInfo,
      approveInfo: {
        currencyAddress: STARKNET_ETH_ADDRESS,
        amount: order.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Executed");
  }, 50_000);
});
