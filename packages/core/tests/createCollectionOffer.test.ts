import { stark } from "starknet";

import {
  createBroker,
  createCollectionOffer,
  fetchOrCreateAccount,
  getOrderStatus
} from "../src/index.js";
import { CollectionOfferV1 } from "../src/types/index.js";
import {
  config,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("createCollectionOffer", () => {
  it("default", async () => {
    const adminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS,
      process.env.SOLIS_ADMIN_PRIVATE_KEY
    );
    const buyerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    const brokerId = stark.randomAddress();
    await createBroker(config, { brokerID: brokerId });
    await whitelistBroker(config, adminAccount, brokerId);

    const offer: CollectionOfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      startAmount: 1
    };

    const orderHash = await createCollectionOffer(config, {
      starknetAccount: buyerAccount,
      offer,
      approveInfo: {
        currencyAddress: STARKNET_ETH_ADDRESS,
        amount: offer.startAmount
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatusAfter).toBe("Open");
  }, 50_000);
});
