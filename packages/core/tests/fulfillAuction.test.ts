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
import { approveERC20, approveERC721, createAccount } from "../src";
import { fetchOrCreateAccount } from "../src/actions/account/account";
import { createAuction, createOffer } from "../src/actions/order";
import { fulfillAuction } from "../src/actions/order/fulfillAuction";
import { getOrderStatus } from "../src/actions/read";
import { AuctionV1, FulfillAuctionInfo, OfferV1 } from "../src/types";

describe("fulfillAuction", () => {
  it("default", async () => {
    const { arkProvider, starknetProvider } = config;
    const brokerId = stark.randomAddress();
    const { account: arkAccount } = await createAccount(arkProvider);
    const admin = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV!,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV!
    );

    const seller = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    const buyer = await fetchOrCreateAccount(
      starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    await whitelistBroker(config, admin, brokerId);
    await mintERC721(starknetProvider, seller);
    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: seller
    });

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 100000000000000000,
      endAmount: 10000000000000000000
    };

    const auctionOrderHash = await createAuction(config, {
      starknetAccount: seller,
      arkAccount,
      order
    });

    await new Promise((resolve) => setTimeout(resolve, 10_000));

    if (process.env.STARKNET_NETWORK_ID === "dev") {
      await mintERC20(starknetProvider, buyer, order.startAmount);
    }

    await approveERC20(config, {
      starknetAccount: buyer,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.endAmount
    });

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId: tokenId,
      startAmount: 100000000000000000
    };

    const offerOrderHash = await createOffer(config, {
      starknetAccount: buyer,
      arkAccount,
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
      starknetAccount: seller,
      arkAccount,
      fulfillAuctionInfo
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { orderStatus: orderStatusBetween } = await getOrderStatus(config, {
      orderHash: auctionOrderHash
    });

    expect(shortString.decodeShortString(orderStatusBetween)).toBe("FULFILLED");

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash: auctionOrderHash
    });

    expect(shortString.decodeShortString(orderStatusAfter)).toBe("EXECUTED");
  }, 100000);
});
