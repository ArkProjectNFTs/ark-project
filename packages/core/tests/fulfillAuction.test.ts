import { shortString, stark } from "starknet";

import { config } from "../examples/config";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC20 } from "../examples/utils/mintERC20";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import { approveERC20, approveERC721 } from "../src";
import { fetchOrCreateAccount } from "../src/actions/account/account";
import { createAuction, createOffer } from "../src/actions/order";
import { fulfillAuction } from "../src/actions/order/fulfillAuction";
import { getOrderStatus } from "../src/actions/read";
import { AuctionV1, FulfillAuctionInfo, OfferV1 } from "../src/types";

describe("fulfillAuction", () => {
  it("default", async () => {
    const { starknetProvider } = config;

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
    const buyerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    const brokerId = stark.randomAddress();
    await whitelistBroker(config, adminAccount, brokerId);

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
    await mintERC721(config.starknetProvider, sellerAccount);
    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: sellerAccount,
      tokenId
    });

    if (process.env.STARKNET_NETWORK_ID === "dev") {
      await mintERC20(starknetProvider, buyerAccount, 10);
    }

    await approveERC20(config, {
      starknetAccount: buyerAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: 10
    });

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 1,
      endAmount: 10
    };

    const auctionOrderHash = await createAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      order
    });

    await new Promise((resolve) => setTimeout(resolve, 10_000));

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId: tokenId,
      startAmount: 5
    };

    const offerOrderHash = await createOffer(config, {
      starknetAccount: buyerAccount,
      arkAccount: adminAccount,
      offer
    });

    const fulfillAuctionInfo: FulfillAuctionInfo = {
      orderHash: auctionOrderHash,
      relatedOrderHash: offerOrderHash,
      tokenAddress: order.tokenAddress,
      tokenId,
      brokerId
    };

    await fulfillAuction(config, {
      starknetAccount: sellerAccount,
      arkAccount: adminAccount,
      fulfillAuctionInfo
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { orderStatus: orderStatusBetween } = await getOrderStatus(config, {
      orderHash: auctionOrderHash
    });

    expect(shortString.decodeShortString(orderStatusBetween)).toBe("FULFILLED");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    //   orderHash: auctionOrderHash
    // });

    // expect(shortString.decodeShortString(orderStatusAfter)).toBe("EXECUTED");
  }, 50_000);
});
