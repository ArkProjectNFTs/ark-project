import { stark } from "starknet";

import { config } from "../examples/config";
import { STARKNET_NFT_ADDRESS } from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import { fetchOrCreateAccount } from "../src/actions/account/account";
import { createAuction } from "../src/actions/order";
import { getOrderType } from "../src/actions/read";
import { AuctionV1 } from "../src/types";
import { getTypeFromCairoCustomEnum } from "./utils";

test("default", async () => {
  // Create test accounts
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  // Create and whitelist fake broker
  const brokerId = stark.randomAddress();
  await whitelistBroker(config, adminAccount, brokerId);

  // Mint and approve seller NFT
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  await mintERC721(config.starknetProvider, sellerAccount);

  // Create auction
  const orderHash = await createAuction(config, {
    starknetAccount: sellerAccount,
    arkAccount: adminAccount,
    order: {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1,
      endAmount: 10
    }
  });

  const orderTypeCairo = await getOrderType(config, { orderHash });
  const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

  expect(orderType).toEqual("AUCTION");
}, 30000);

test("error: invalid start date", async () => {
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const brokerId = stark.randomAddress();
  await whitelistBroker(config, adminAccount, brokerId);

  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  await mintERC721(config.starknetProvider, sellerAccount);

  const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

  const order: AuctionV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId),
    startDate: invalidStartDate,
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: invalid end date", async () => {
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const brokerId = stark.randomAddress();
  await whitelistBroker(config, adminAccount, brokerId);

  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  await mintERC721(config.starknetProvider, sellerAccount);

  const invalidEndDate = Math.floor(Date.now() / 1000);

  const order: AuctionV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId),
    endDate: invalidEndDate,
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: invalid end amount", async () => {
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const brokerId = stark.randomAddress();
  await whitelistBroker(config, adminAccount, brokerId);

  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  await mintERC721(config.starknetProvider, sellerAccount);

  const order: AuctionV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId),
    startAmount: 1,
    endAmount: 0
  };

  await expect(
    createAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: broker not whitelisted", async () => {
  const adminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const sellerAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const brokerId = stark.randomAddress();
  await whitelistBroker(config, adminAccount, brokerId);

  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  await mintERC721(config.starknetProvider, sellerAccount);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId),
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);
