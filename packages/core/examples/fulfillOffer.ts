/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  createOffer,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src";

// Initialize the RPC provider with the ArkChain node URL
const starknetProvider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

// Initialize the RPC provider with the katana node URL for starknet
const arkProvider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async (arkProvider: RpcProvider, starknetProvider: RpcProvider) => {
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(arkProvider);
  const { account: starknetAccount } = await createAccount(starknetProvider);

  // Define the order details
  let order: OfferV1 = {
    brokerId: 124, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 358, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the arkchain using the order details
  let orderHash = await createOffer(
    arkProvider,
    starknetAccount,
    arkAccount,
    order
  );

  // wait 10 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 10000));

  let { orderStatus: orderStatusBefore } = await getOrderStatus(
    orderHash,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusBefore));

  // Create a new account for the listing using the provider
  const { account: fulfiller_account } = await createAccount(starknetProvider);

  // Define the cancel details
  const fulfill_info = {
    order_hash: orderHash,
    token_address: order.tokenAddress,
    token_id: order.tokenId
  };

  // Cancel the order
  fulfillOffer(arkProvider, fulfiller_account, arkAccount, fulfill_info);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(arkProvider, starknetProvider);
