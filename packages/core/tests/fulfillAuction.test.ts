import { stark } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account.js";
import { fulfillAuction } from "../src/actions/order/fulfillAuction.js";
import { createAuction, createOffer } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import { createBroker } from "../src/index.js";
import { AuctionV1, OfferV1 } from "../src/types/index.js";
import {
  config,
  getBalance,
  mintERC20,
  mintERC721,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("fulfillAuction", () => {
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
    const buyerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    const brokerId = stark.randomAddress();
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const tokenId = await mintERC721({ account: sellerAccount });
    const startAmount = 1_000_000;
    await mintERC20({ account: buyerAccount, amount: startAmount });

    const initialSellerBalance = await getBalance({ account: sellerAccount });

    const order: AuctionV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: BigInt(startAmount),
      endAmount: BigInt(startAmount + 1_000)
    };

    const orderHash = await createAuction(config, {
      starknetAccount: sellerAccount,
      order,
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: BigInt(startAmount)
    };

    const offerOrderHash = await createOffer(config, {
      starknetAccount: buyerAccount,
      offer,
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: offer.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    await fulfillAuction(config, {
      starknetAccount: sellerAccount,
      fulfillAuctionInfo: {
        orderHash,
        relatedOrderHash: offerOrderHash,
        tokenAddress: order.tokenAddress,
        tokenId,
        brokerId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    const sellerBalance = await getBalance({ account: sellerAccount });
    const fees = (BigInt(offer.startAmount) * BigInt(1)) / BigInt(100);
    const amount = BigInt(offer.startAmount) - fees;

    expect(orderStatus).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + amount);
  }, 50_000);
});
