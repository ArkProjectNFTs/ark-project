/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * and submitting a listing order.
 */

import { RpcProvider, shortString } from "starknet";

import { createAccount } from "../src/actions/account/account";
import { createListing } from "../src/actions/order";
import { getOrderHash, getOrderStatus } from "../src/actions/read";
import { ListingV1 } from "../src/types";

// Initialize the RPC provider with the ArkChain node URL
const starknetProvider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:5050"
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
  // Create a new account using the provider
  const { account: arkAccount } = await createAccount(arkProvider);
  const { account: starknetAccount } = await createAccount(starknetProvider);

  // Define the order details
  let order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 910, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the blockchain using the order details
  await createListing(arkProvider, starknetAccount, arkAccount, order);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // Get the order hash
  const { orderHash } = await getOrderHash(
    order.tokenId,
    order.tokenAddress,
    arkProvider
  );

  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(arkProvider, starknetProvider);
