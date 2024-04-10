import { stark } from "starknet";

import { config } from "../examples/config";
import { STARKNET_NFT_ADDRESS } from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { createAuction } from "../src/actions/order";
import { getOrderType } from "../src/actions/read";
import { AuctionV1 } from "../src/types";
import { getTypeFromCairoCustomEnum } from "./utils";

test("default", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
  const brokerId = stark.randomAddress();

  const solisAdminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await whitelistBroker(config, solisAdminAccount, brokerId);
  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: AuctionV1 = {
    brokerId: 123,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startAmount: 1,
    endAmount: 10
  };

  const orderHash = await createAuction(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    order
  });

  const orderTypeCairo = await getOrderType(config, { orderHash });
  const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

  expect(orderType).toEqual("AUCTION");
}, 30000);

test("error: invalid start date", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  const invalidStartDate = Math.floor(Date.now() / 1000 - 30);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startDate: invalidStartDate,
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: invalid end date", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  const invalidEndDate = Math.floor(Date.now() / 1000);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    endDate: invalidEndDate,
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: invalid end amount", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startAmount: 1,
    endAmount: 1
  };

  await expect(
    createAuction(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);

test("error: broker not whitelisted", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: AuctionV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startAmount: 1,
    endAmount: 10
  };

  await expect(
    createAuction(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    })
  ).rejects.toThrow();
}, 20000);
