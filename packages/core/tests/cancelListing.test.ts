import { shortString } from "starknet";

import { config } from "../examples/config/index.js";
import { STARKNET_NFT_ADDRESS } from "../examples/constants/index.js";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId.js";
import { mintERC721 } from "../examples/utils/mintERC721.js";
import { whitelistBroker } from "../examples/utils/whitelistBroker.js";
import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account.js";
import { cancelOrder, createListing } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import { ListingV1 } from "../src/types/index.js";

test("ArkProject Cancel listing should create and then cancel a listing", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
  expect(arkAccount).toBeDefined();

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  const solisAdminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );

  await whitelistBroker(config, solisAdminAccount, 123);

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  const order: ListingV1 = {
    brokerId: 123,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId: tokenId,
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

  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  };

  cancelOrder(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    cancelInfo
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });
  expect(shortString.decodeShortString(orderStatusAfter)).toBe(
    "CANCELLED_USER"
  );
}, 15000);
