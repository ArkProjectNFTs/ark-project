/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { cancelOrder, createListing } from "../src/actions/order";
import { getOrderHash, getOrderStatus } from "../src/actions/read";
import { getContractAddresses, Network } from "../src/constants";
import { ListingV1 } from "../src/types";

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
  // Create a new account using the provider
  const { account: arkAccount } = await createAccount(arkProvider);
  const starknetAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT1_ADDRESS,
    process.env.ACCOUNT1_PRIVATE_KEY
  );

  const { STARKNET_NFT_ADDRESS } = getContractAddresses(network);

  // Define the order details
  let order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: 6, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  console.log("Creating listing order...");
  // Create the listing on the arkchain using the order details
  await createListing(network, arkProvider, starknetAccount, arkAccount, order);

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Get the order hash
  const { orderHash } = await getOrderHash(
    order.tokenId,
    order.tokenAddress,
    network,
    arkProvider
  );

  let { orderStatus: orderStatusBefore } = await getOrderStatus(
    orderHash,
    network,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusBefore));

  // Define the cancel details
  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  };

  // Cancel the order
  cancelOrder(network, arkProvider, starknetAccount, arkAccount, cancelInfo);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    network,
    arkProvider
  );
  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(network, arkProvider, starknetProvider);
