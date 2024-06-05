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
  mintERC721,
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

    const tokenId = await mintERC721({ account: sellerAccount });
    const startAmount = 1000;
    await mintERC20({ account: buyerAccount, amount: startAmount });

    const initialBuyerBalance = await getBalance({ account: buyerAccount });

    const offer: CollectionOfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      startAmount: BigInt(startAmount)
    };

    const orderHash = await createCollectionOffer(config, {
      starknetAccount: buyerAccount,
      offer,
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: offer.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 3_000));

    await fulfillCollectionOffer(config, {
      starknetAccount: sellerAccount,
      fulfillOfferInfo: {
        orderHash,
        tokenAddress: offer.tokenAddress,
        tokenId: tokenId,
        brokerId
      },
      approveInfo: {
        tokenAddress: offer.tokenAddress,
        tokenId: tokenId
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
    expect(sellerBalance).toEqual(initialBuyerBalance - amount);
  }, 50_000);
});
