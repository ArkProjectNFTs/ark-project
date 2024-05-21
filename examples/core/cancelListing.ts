/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { stark } from "starknet";

import {
  cancelOrder,
  createAccount,
  createBroker,
  createListing,
  fetchOrCreateAccount,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config } from "./config/index.js";
import { STARKNET_NFT_ADDRESS } from "./constants/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { mintERC721 } from "./utils/mintERC721.js";

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async () => {
  const brokerId = stark.randomAddress();
  await createBroker(config, { brokerID: brokerId });
  // Create a new account using the provider
  const { account: arkAccount } = await createAccount(config.arkProvider);

  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

  // Define the order details
  const order: ListingV1 = {
    brokerId,
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: tokenId, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  console.log("Creating listing order...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    order,
    approveInfo: {
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId
    }
  });

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("=> Fetching order status...");
  const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", orderStatusBefore);

  // Define the cancel details
  const cancelInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId: order.tokenId
  };

  console.log("Cancelling listing order...");
  // Cancel the order
  cancelOrder(config, {
    starknetAccount: starknetOffererAccount,
    cancelInfo
  });

  // wait 2 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("=> Fetching order status...");
  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", orderStatusAfter);
})();
