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
  Network,
  OfferV1
} from "../src";
import { fetchOrCreateAccount } from "../src/actions/account/account";

// Initialize the RPC provider with the ArkChain node URL
const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL ?? "localhost:5050"
});

// Initialize the RPC provider with the katana node URL for starknet
const arkProvider = new RpcProvider({
  nodeUrl: process.env.ARKCHAIN_RPC_URL ?? "http://0.0.0.0:7777"
});

const network = (process.env.NETWORK ?? "dev") as Network;

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async (
  network: Network,
  arkProvider: RpcProvider,
  starknetProvider: RpcProvider
) => {
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(arkProvider);
  const starknetAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT1_ADDRESS,
    process.env.ACCOUNT1_PRIVATE_KEY
  );

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
    network,
    arkProvider,
    starknetAccount,
    arkAccount,
    order
  );

  // wait 10 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  let { orderStatus: orderStatusBefore } = await getOrderStatus(
    orderHash,
    network,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusBefore));

  // Create a new account for the listing using the provider
  const fulfillerAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT2_ADDRESS,
    process.env.ACCOUNT2_PRIVATE_KEY
  );

  // Define the cancel details
  const fulfillInfo = {
    order_hash: orderHash,
    token_address: order.tokenAddress,
    token_id: order.tokenId
  };

  // Cancel the order
  fulfillOffer(network, arkProvider, fulfillerAccount, arkAccount, fulfillInfo);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    network,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(network, arkProvider, starknetProvider);
