import { shortString } from "starknet";

import { config } from "../examples/config";
import { STARKNET_NFT_ADDRESS } from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC721 } from "../examples/utils/mintERC721";
import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { cancelOrder, createListing } from "../src/actions/order";
import { getOrderStatus } from "../src/actions/read";
import { ListingV1 } from "../src/types";

test("ArkProject Cancel listing should create and then cancel a listing", async () => {
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
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
  expect(shortString.decodeShortString(orderStatusAfter)).toBe(
    "CANCELLED_USER"
  );
}, 20000);
