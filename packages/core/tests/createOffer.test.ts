import { stark } from "starknet";

import {
  createBroker,
  createOffer,
  fetchOrCreateAccount,
  getOrderStatus,
  OfferV1
} from "../src/index.js";
import {
  config,
  mintERC721,
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS,
  whitelistBroker
} from "./utils/index.js";

describe("createOffer", () => {
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

    const tokenId = await mintERC721({ account: buyerAccount });

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: BigInt(1)
    };

    const orderHash = await createOffer(config, {
      starknetAccount: buyerAccount,
      offer: {
        brokerId,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(1)
      },
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
