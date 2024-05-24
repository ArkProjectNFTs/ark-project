import { stark } from "starknet";

import {
  createBroker,
  createOffer,
  fetchOrCreateAccount,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src/index.js";
import {
  config,
  getBalance,
  mintERC20,
  mintERC721,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("fulfillOffer", () => {
  it("default", async function () {
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
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const tokenId = await mintERC721({ account: sellerAccount });
    await mintERC20({ account: buyerAccount, amount: 100000000000000000 });

    const initialSellerBalance = await getBalance({ account: sellerAccount });

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: BigInt(1000000000)
    };

    const orderHash = await createOffer(config, {
      starknetAccount: buyerAccount,
      offer,
      approveInfo: {
        currencyAddress: STARKNET_ETH_ADDRESS,
        amount: offer.startAmount
      }
    });

    await fulfillOffer(config, {
      starknetAccount: sellerAccount,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId,
        brokerId
      },
      approveInfo: {
        tokenAddress: offer.tokenAddress,
        tokenId: offer.tokenId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });
    const sellerBalance = await getBalance({ account: sellerAccount });
    const fees = (BigInt(offer.startAmount) * BigInt(1)) / BigInt(100);
    const amount = BigInt(offer.startAmount) - fees;

    expect(orderStatusFulfilled).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + amount);
  }, 50_000);

  // it("error: owner of token changed", async function () {
  // }, 50000);
});
