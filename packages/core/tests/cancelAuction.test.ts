import { shortString, stark } from "starknet";

import { config } from "../examples/config";
import { STARKNET_NFT_ADDRESS } from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import { fetchOrCreateAccount } from "../src/actions/account/account";
import { cancelOrder, createAuction } from "../src/actions/order";
import { getOrderStatus } from "../src/actions/read";
import { AuctionV1 } from "../src/types";

test("cancelListing", async () => {
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
    brokerId: brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS,
    tokenId,
    startAmount: 1,
    endAmount: 10
  };

  const orderHash = await createAuction(config, {
    starknetAccount: sellerAccount,
    arkAccount: adminAccount,
    order
  });

  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  };

  cancelOrder(config, {
    starknetAccount: sellerAccount,
    arkAccount: adminAccount,
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
