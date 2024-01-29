import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  createOffer,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src";
import { generateRandomTokenId } from "./utils";

chai.use(chaiAsPromised);

describe("ArkProject Listing and Offer Fulfillment", () => {
  it("should create an offer and fulfill the offer", async function () {
    this.timeout(10000); // Extend timeout if necessary

    // Initialize the RPC provider with the ArkChain node URL
    const starknetProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Initialize the RPC provider with the katana node URL for starknet
    const arkProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account for the listing using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);

    // Define the order details
    const order: OfferV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the arkchain using the order details
    const orderHash = await createOffer(
      arkProvider,
      starknetAccount,
      arkAccount,
      order
    );
    expect(orderHash).to.exist;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { orderStatus: orderStatusBefore } = await getOrderStatus(
      orderHash,
      arkProvider
    );
    expect(shortString.decodeShortString(orderStatusBefore)).to.equal("OPEN");

    // Create a new account for fulfilling the offer
    const { account: starknetFulfillerAccount } =
      await createAccount(starknetProvider);

    expect(starknetFulfillerAccount).to.exist;

    // Define the fulfill details
    const fulfill_info = {
      order_hash: orderHash,
      token_address: order.tokenAddress,
      token_id: order.tokenId
    };

    // Fulfill the offer
    await fulfillOffer(
      arkProvider,
      starknetFulfillerAccount,
      arkAccount,
      fulfill_info
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const { orderStatus: orderStatusAfter } = await getOrderStatus(
      orderHash,
      arkProvider
    );

    expect(shortString.decodeShortString(orderStatusAfter)).to.equal(
      "FULFILLED"
    );
  });
});
