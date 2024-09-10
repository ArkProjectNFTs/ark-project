import { fulfillAuction } from "../src/actions/order/fulfillAuction.js";
import { createAuction, createOffer } from "../src/actions/order/index.js";
import { getOrderStatus } from "../src/actions/read/index.js";
import {
  accounts,
  config,
  getBalance,
  mintERC20,
  mintERC721
} from "./utils/index.js";

describe("fulfillAuction", () => {
  it("default", async () => {
    const { seller, buyer } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const initialSellerBalance = await getBalance({ account: seller });
    await mintERC20({ account: buyer, amount: 5000 });

    const { orderHash } = await createAuction(config, {
      starknetAccount: seller,
      order: {
        brokerId: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(1000),
        endAmount: BigInt(5000)
      },
      approveInfo: {
        tokenAddress,
        tokenId
      }
    });

    const offerAmount = BigInt(1000);
    const { orderHash: offerOrderHash } = await createOffer(config, {
      starknetAccount: buyer,
      offer: {
        brokerId: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: offerAmount
      },
      approveInfo: {
        currencyAddress: config.starknetCurrencyContract,
        amount: offerAmount
      }
    });

    await fulfillAuction(config, {
      starknetAccount: seller,
      fulfillAuctionInfo: {
        orderHash,
        relatedOrderHash: offerOrderHash,
        tokenAddress,
        tokenId,
        brokerId: accounts.listingBroker.address
      }
    });

    const { orderStatus } = await getOrderStatus(config, {
      orderHash
    });

    const sellerBalance = await getBalance({ account: seller });
    const fees = (BigInt(offerAmount) * BigInt(4)) / BigInt(100);
    const profit = BigInt(offerAmount) - fees;

    expect(orderStatus).toBe("Executed");
    expect(sellerBalance).toEqual(initialSellerBalance + profit);
  }, 50_000);
});
