import { createOffer, getOrderStatus } from "../src/index.js";
import {
  accounts,
  config,
  mintERC20,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("createOffer", () => {
  it("default", async () => {
    const { offerer, fulfiller } = accounts;
    const tokenId = await mintERC721({ account: offerer });
    await mintERC20({ account: fulfiller, amount: 1 });

    const orderHash = await createOffer(config, {
      starknetAccount: fulfiller,
      offer: {
        brokerId: accounts.listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(10)
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: BigInt(10)
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });

    expect(orderStatusAfter).toBe("Open");
  }, 50_000);
});
