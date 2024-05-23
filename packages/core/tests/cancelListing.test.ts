import { stark } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account.js";
import { cancelOrder, createListing } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import { createBroker } from "../src/index.js";
import {
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("cancelListing", () => {
  test("default", async () => {
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

    const brokerId = stark.randomAddress();
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const tokenId = await mintERC721({ account: sellerAccount });

    const orderHash = await createListing(config, {
      starknetAccount: sellerAccount,
      order: {
        brokerId,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId: tokenId,
        startAmount: 1
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    cancelOrder(config, {
      starknetAccount: sellerAccount,
      cancelInfo: {
        orderHash: orderHash,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });
    expect(orderStatus).toBe("CancelledUser");
  }, 50_000);
});
