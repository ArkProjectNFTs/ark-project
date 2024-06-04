import { stark } from "starknet";

import {
  createBroker,
  createCollectionOffer,
  fetchOrCreateAccount,
  fulfillCollectionOffer,
  getOrderStatus
} from "../src/index.js";
import { CollectionOfferV1 } from "../src/types/index.js";
import {
  config,
  getBalance,
  mintERC20,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("fulfillCollectionOffer", () => {
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

    await mintERC20({ account: buyerAccount, amount: 100000000000000000 });

    const initialBuyerBalance = await getBalance({ account: buyerAccount });

    const offer: CollectionOfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      startAmount: BigInt(1000)
    };

    const orderHash = await createCollectionOffer(config, {
      starknetAccount: buyerAccount,
      offer,
      approveInfo: {
        currencyAddress: STARKNET_ETH_ADDRESS,
        amount: offer.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 3_000));

    await fulfillCollectionOffer(config, {
      starknetAccount: sellerAccount,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress: offer.tokenAddress,
        brokerId
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus: orderStatusFulfilled } = await getOrderStatus(config, {
      orderHash
    });

    const buyerBalance = await getBalance({ account: buyerAccount });
    const fees = (BigInt(offer.startAmount) * BigInt(1)) / BigInt(100);
    const amount = BigInt(offer.startAmount) - fees;

    expect(orderStatusFulfilled).toBe("Fulfilled");
    expect(buyerBalance).toEqual(initialBuyerBalance - amount);
  }, 50_000);
});
