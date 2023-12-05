/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { RpcProvider } from "starknet";

import { createAccount } from "../src/account";
import { createListing } from "../src/createOrder/createListing";
import { fulfillListing } from "../src/fulfillOrder";
import { getOrderHash } from "../src/order";
import { BaseOrderV1, RouteType } from "../src/types";

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
  let order: BaseOrderV1 = {
    route: RouteType.Erc721ToErc20, // The type of route for the order
    offerer:
      "0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078", // The address of the offerer
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 6, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the arkchain using the order details
  await createListing(provider, listing_account, order);

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Get the order hash
  const { orderHash } = await getOrderHash(
    order.tokenId,
    order.tokenAddress,
    provider
  );

  // Create a new account for the listing using the provider
  const { account: fulfiller_account } = await createAccount(provider);

  // Define the cancel details
  const fulfill_info = {
    order_hash: orderHash,
    token_address: order.tokenAddress,
    token_id: order.tokenId
  };

  // Cancel the order
  fulfillListing(provider, fulfiller_account, fulfill_info);
})(provider);
