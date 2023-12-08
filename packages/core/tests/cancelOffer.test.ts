import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { RpcProvider, shortString } from "starknet";

import {
  cancelOrder,
  createAccount,
  createOffer,
  getOrderStatus,
  getOrderType,
  ListingV1
} from "../src";
import {
  generateRandomTokenId,
  getTypeFromCairoCustomEnum,
  sleep
} from "./utils";

chai.use(chaiAsPromised);

describe("ArkProject cancel offer", () => {
  it("should create an offer and verify its status and type", async function () {
    // Initialize the RPC provider with the ArkChain node URL
    const provider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account using the provider
    const { account } = await createAccount(provider);
    expect(account).to.exist; // Assert that account creation was successful

    // Define the order details
    let order: ListingV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the blockchain using the order details
    let orderHash = await createOffer(provider, account, order);
    // Assert that the listing was created successfully (if possible)
    await sleep(1000); // Wait for the transaction to be processed

    // Assert that the order is open
    await expect(
      getOrderStatus(orderHash, provider).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("OPEN");

    // Assert that the order type is 'OFFER'
    await expect(
      getOrderType(orderHash, provider).then((res) =>
        getTypeFromCairoCustomEnum(res.orderType)
      )
    ).to.eventually.equal("OFFER");

    // Define the cancel details
    const cancelInfo = {
      order_hash: orderHash,
      token_address: order.tokenAddress,
      token_id: order.tokenId
    };

    // Cancel the order
    await cancelOrder(provider, account, cancelInfo);

    // Assert that the order was cancelled successfully
    await expect(
      getOrderStatus(orderHash, provider).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("CANCELLED_USER");
  });
});
