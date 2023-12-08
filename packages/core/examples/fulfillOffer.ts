/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  createListing,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src";

// Initialize the RPC provider with the ArkChain node URL
const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async (provider: RpcProvider) => {
  // Create a new account for the listing using the provider
  const { account: listing_account } = await createAccount(provider);

  // Define the order details
  let order: OfferV1 = {
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 36, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the arkchain using the order details
  let orderHash = await createListing(provider, listing_account, order);

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 2000));

  let { orderStatus: orderStatusBefore } = await getOrderStatus(
    orderHash,
    provider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusBefore));

  // Create a new account for the listing using the provider
  const { account: fulfiller_account } = await createAccount(provider);

  // Define the cancel details
  const fulfill_info = {
    order_hash: orderHash,
    token_address: order.tokenAddress,
    token_id: order.tokenId
  };

  // Cancel the order
  fulfillOffer(provider, fulfiller_account, fulfill_info);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    provider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(provider);
