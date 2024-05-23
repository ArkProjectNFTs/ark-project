import { stark } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account.js";
import { createListing } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import { createBroker } from "../src/index.js";
import { ListingV1 } from "../src/types/index.js";
import {
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("createListing", () => {
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

    const brokerId = stark.randomAddress();
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const starknetOffererAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    const tokenId = await mintERC721({ account: sellerAccount });

    const order: ListingV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1
    };

    const orderHash = await createListing(config, {
      starknetAccount: starknetOffererAccount,
      order,
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatus).toBe("Open");
  }, 50_000);

  // it("error: broker not whitelisted", async () => {
  //   const sellerAccount = await fetchOrCreateAccount(
  //     config.starknetProvider,
  //     process.env.STARKNET_ACCOUNT1_ADDRESS,
  //     process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  //   );

  //   const tokenId = await mintERC721({ account: sellerAccount });

  //   const order: ListingV1 = {
  //     brokerId: 12345,
  //     tokenAddress: STARKNET_NFT_ADDRESS,
  //     tokenId,
  //     startAmount: 1
  //   };

  //   await expect(
  //     createListing(config, {
  //       starknetAccount: sellerAccount,
  //       approveInfo: {
  //         tokenAddress: STARKNET_NFT_ADDRESS,
  //         tokenId
  //       },
  //       order
  //     })
  //   ).rejects.toThrow();
  // }, 50_0000);
});
