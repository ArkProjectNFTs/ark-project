/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * and submitting a listing order.
 */

import { RpcProvider } from "starknet";

import { createAccount } from "../src/actions/account/account";
import { createOffer } from "../src/actions/order";
import { OfferV1 } from "../src/types";

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
  // Create a new account using the provider
  const { account } = await createAccount(provider);

  // Define the order details
  let order: OfferV1 = {
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 39, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the blockchain using the order details
  await createOffer(provider, account, order);
})(provider);
