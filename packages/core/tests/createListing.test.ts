import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { RpcProvider, shortString } from "starknet";

import { config } from "../examples/config"; // Assuming you have a sleep utility function
import {
  createAccount,
  createListing,
  getOrderStatus,
  ListingV1
} from "../src";
import { generateRandomTokenId, sleep } from "./utils";

chai.use(chaiAsPromised);

describe("ArkProject Create listing", () => {
  it("should create a listing", async function () {
    // Initialize the RPC provider with the ArkChain node URL
    const starknetProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Initialize the RPC provider with the katana node URL for starknet
    const arkProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);

    expect(arkAccount).to.exist;
    expect(starknetAccount).to.exist;

    // Define the order details
    const order: ListingV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the arkchain using the order details
    const orderHash = await createListing(config, {
      starknetAccount,
      arkAccount,
      order
    });
    await sleep(1000); // Wait for the transaction to be processed

    // Assert that we received an order hash
    expect(orderHash).to.exist;

    // Assert that the order is open
    await expect(
      getOrderStatus(config, { orderHash }).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("OPEN");
  });

  it("should fail because offerer is not the owner", async function () {
    // Initialize the RPC provider with the ArkChain node URL
    const starknetProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Initialize the RPC provider with the katana node URL for starknet
    const arkProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);
    const { account: starknetAccountOther } =
      await createAccount(starknetProvider);

    expect(arkAccount).to.exist;
    expect(starknetAccount).to.exist;

    // Define the order details
    const order: ListingV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the arkchain using the order details
    const orderHash = await createListing(config, {
      starknetAccount: starknetAccountOther,
      arkAccount,
      order
    });
    await sleep(1000); // Wait for the transaction to be processed

    // Assert that we received an order hash
    expect(orderHash).to.exist;

    // Assert that the order is open
    await expect(
      getOrderStatus(config, { orderHash }).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("OPEN");
  });

  it("should fail because offerer is not the owner", async function () {
    // Initialize the RPC provider with the ArkChain node URL
    const starknetProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Initialize the RPC provider with the katana node URL for starknet
    const arkProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create a new account using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);
    const { account: starknetAccountOther } = await createAccount(starknetProvider);

    expect(arkAccount).to.exist;
    expect(starknetAccount).to.exist;

    // Define the order details
    const order: ListingV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    // Create the listing on the arkchain using the order details
    const orderHash = await createListing(config, {
      starknetAccount: starknetAccountOther,
      arkAccount,
      order
    });
    await sleep(1000); // Wait for the transaction to be processed

    // Assert that we received an order hash
    expect(orderHash).to.exist;

    // Assert that the order is open
    await expect(
      getOrderStatus(config, {orderHash}).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("OPEN");

  });

});
