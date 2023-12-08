import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  createListing,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src";
import { generateRandomTokenId } from "./utils";

chai.use(chaiAsPromised);

describe("ArkProject Listing and Offer Fulfillment", () => {
  it("should create a listing and fulfill an offer", async function () {
    this.timeout(10000); // Extend timeout if necessary

    // Initialize the RPC provider with the ArkChain node URL
    const provider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account for the listing using the provider
    const { account: listing_account } = await createAccount(provider);
    expect(listing_account).to.exist;

    // Define the order details
    let order: OfferV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the arkchain using the order details
    const orderHash = await createListing(provider, listing_account, order);
    expect(orderHash).to.exist;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let { orderStatus: orderStatusBefore } = await getOrderStatus(
      orderHash,
      provider
    );
    expect(shortString.decodeShortString(orderStatusBefore)).to.equal("OPEN");

    // Create a new account for fulfilling the offer
    const { account: fulfiller_account } = await createAccount(provider);
    expect(fulfiller_account).to.exist;

    // Define the fulfill details
    const fulfill_info = {
      order_hash: orderHash,
      token_address: order.tokenAddress,
      token_id: order.tokenId
    };

    // Fulfill the offer
    await fulfillOffer(provider, fulfiller_account, fulfill_info);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let { orderStatus: orderStatusAfter } = await getOrderStatus(
      orderHash,
      provider
    );
    expect(shortString.decodeShortString(orderStatusAfter)).to.equal(
      "FULFILLED"
    );
  });
});
