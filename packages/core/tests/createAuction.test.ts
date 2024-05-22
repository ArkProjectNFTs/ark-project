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
  getCurrentTokenId,
  getTypeFromCairoCustomEnum,
  mintERC721,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

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

  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

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

test("error: invalid start date", async () => {
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
  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
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

test("error: invalid end date", async () => {
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

  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

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

test("error: invalid end amount", async () => {
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

  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

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

test("error: broker not whitelisted", async () => {
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, sellerAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
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
