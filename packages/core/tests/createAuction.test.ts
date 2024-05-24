import { stark } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account.js";
import {
  AuctionV1,
  createAuction,
  createBroker,
  getOrderType
} from "../src/index.js";
import {
  config,
  getTypeFromCairoCustomEnum,
  mintERC721,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("createAuction", () => {
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

    const tokenId = await mintERC721({ account: sellerAccount });

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1,
      endAmount: 10
    };

    const orderHash = await createAuction(config, {
      starknetAccount: sellerAccount,
      order,
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    const orderTypeCairo = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

    expect(orderType).toEqual("AUCTION");
  }, 50_000);

  it("error: invalid start date", async () => {
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

    const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startDate: invalidStartDate,
      startAmount: 1,
      endAmount: 10
    };

    await expect(
      createAuction(config, {
        starknetAccount: sellerAccount,
        order,
        approveInfo: {
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        }
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end date", async () => {
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

    const invalidEndDate = Math.floor(Date.now() / 1000);

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      endDate: invalidEndDate,
      startAmount: 1,
      endAmount: 10
    };

    await expect(
      createAuction(config, {
        starknetAccount: sellerAccount,
        approveInfo: {
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);

  it("error: invalid end amount", async () => {
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

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1,
      endAmount: 0
    };

    await expect(
      createAuction(config, {
        starknetAccount: sellerAccount,
        approveInfo: {
          tokenAddress: STARKNET_NFT_ADDRESS,
          tokenId
        },
        order
      })
    ).rejects.toThrow();
  }, 50_000);

  // it("error: broker not whitelisted", async () => {
  //   const sellerAccount = await fetchOrCreateAccount(
  //     config.starknetProvider,
  //     process.env.STARKNET_ACCOUNT1_ADDRESS,
  //     process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  //   );

  //   const brokerId = stark.randomAddress();
  //   await createBroker(config, { brokerID: brokerId });

  //   const tokenId = await mintERC721({ account: sellerAccount });

  //   const order: AuctionV1 = {
  //     brokerId,
  //     tokenAddress: STARKNET_NFT_ADDRESS,
  //     tokenId,
  //     startAmount: 1,
  //     endAmount: 10
  //   };

  //   await createAuction(config, {
  //     starknetAccount: sellerAccount,
  //     approveInfo: {
  //       tokenAddress: STARKNET_NFT_ADDRESS,
  //       tokenId
  //     },
  //     order
  //   });

  //   await new Promise((resolve) => setTimeout(resolve, 10_000));

  //   await expect(
  //     createAuction(config, {
  //       starknetAccount: sellerAccount,
  //       approveInfo: {
  //         tokenAddress: STARKNET_NFT_ADDRESS,
  //         tokenId
  //       },
  //       order
  //     })
  //   ).rejects.toThrow();
  // }, 50_000);
});
