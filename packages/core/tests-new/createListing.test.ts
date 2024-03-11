import { shortString } from "starknet";

import { config } from "../examples/config";
import { STARKNET_NFT_ADDRESS } from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { createListing } from "../src/actions/order";
import { getOrderStatus } from "../src/actions/read";
import { ListingV1 } from "../src/types";

test("ArkProject create a listing", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
  expect(arkAccount).toBeDefined();

  const solisAdminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );

  await whitelistBroker(config, solisAdminAccount, 123);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: ListingV1 = {
    brokerId: 123,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startAmount: 600000000000000000
  };

  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    order
  });
  expect(orderHash).toBeDefined();

  const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
    orderHash
  });

  expect(shortString.decodeShortString(orderStatusBefore)).toBe("OPEN");
}, 30000);

test("ArkProject create a listing without whitelisting broker", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
  expect(arkAccount).toBeDefined();

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: ListingV1 = {
    brokerId: 12345,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: BigInt(tokenId) + BigInt(1),
    startAmount: 600000000000000000
  };

  try {
    await createListing(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    });
  } catch (e) {
    const errorString = e instanceof Error ? e.message : JSON.stringify(e);
    expect(errorString).toMatch(/Transaction execution has failed./);
  }
}, 20000);
