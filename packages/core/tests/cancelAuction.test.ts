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
import { cancelOrder, createAuction } from "../src/actions/order";
import { getOrderStatus } from "../src/actions/read";
import { AuctionV1 } from "../src/types";

test("cancelListing", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
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

  const order: AuctionV1 = {
    brokerId: 123,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: 1,
    endAmount: 10
  };

  const orderHash = await createAuction(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    order
  });

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
