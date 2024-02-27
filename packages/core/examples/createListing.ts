/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order.
 * checking the order status
 */

import { shortString } from "starknet";

import "dotenv/config";

import {
  approveERC721,
  createAccount,
  createListing,
  fetchOrCreateAccount,
  getOrderStatus,
  ListingV1
} from "../src";
import { config } from "./config";
import { STARKNET_NFT_ADDRESS } from "./constants";
import { getCurrentTokenId } from "./utils/getCurrentTokenId";
import { getTokenOwner } from "./utils/getTokenOwner";
import { mintERC721 } from "./utils/mintERC721";

/**
 * Creates a listing on the blockchain using provided order details.
 */
(async () => {
  console.log(`=> Creating account`);
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(config.arkProvider);

  console.log(
    `=> Fetching or creating offerer starknet account, for test purpose only`
  );
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  console.log("=> Minting token at contract address: ", STARKNET_NFT_ADDRESS);
  await mintERC721(config.starknetProvider, starknetOffererAccount);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  const owner = await getTokenOwner(config, STARKNET_NFT_ADDRESS, tokenId);
  console.log(owner);
  console.log(`=> Approving for all`);
  await approveERC721(config, {
    contractAddress: STARKNET_NFT_ADDRESS,
    starknetAccount: starknetOffererAccount
  });

  console.log(`=> Creating order`);
  // Define the order details
  const order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: tokenId, // The ID of the token
    startAmount: 100000000000000000 // The starting amount for the order
  };

  console.log("=> Creating listing...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    order
  });

  console.log("=> Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", shortString.decodeShortString(orderStatus));
})();
