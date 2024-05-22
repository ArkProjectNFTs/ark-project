import { stark } from "starknet";

import {
  approveERC721,
  cancelOrder,
  createBroker,
  createOffer,
  fetchOrCreateAccount,
  getOrderStatus,
  OfferV1
} from "../src/index.js";
import {
  config,
  getCurrentTokenId,
  mintERC721,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("cancelOffer", () => {
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

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
    await mintERC721(config.starknetProvider, sellerAccount);
    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: sellerAccount,
      tokenId
    });

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1
    };

    const orderHash = await createOffer(config, {
      starknetAccount: sellerAccount,
      offer: offer,
      approveInfo: {
        currencyAddress: STARKNET_ETH_ADDRESS,
        amount: offer.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const cancelInfo = {
      orderHash: orderHash,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId
    };

    await cancelOrder(config, {
      starknetAccount: sellerAccount,
      cancelInfo
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toEqual("CancelledUser");
  }, 50_000);
});
