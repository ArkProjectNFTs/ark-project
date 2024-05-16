/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order.
 * checking the order status
 */

import "dotenv/config";

import { stark } from "starknet";

import {
  createBroker,
  createListing,
  fetchOrCreateAccount,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config } from "./config/index.js";
import { STARKNET_NFT_ADDRESS } from "./constants/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { getTokenOwner } from "./utils/getTokenOwner.js";
import { mintERC721 } from "./utils/mintERC721.js";
import { whitelistBroker } from "./utils/whitelistBroker.js";

/**
 * Creates a listing on the blockchain using provided order details.
 */
(async () => {
  const brokerId = stark.randomAddress();
  await createBroker(config, { brokerID: brokerId });

  const solisAdminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );

  console.log(`=> Whitelisting broker ${brokerId}`);
  await whitelistBroker(config, solisAdminAccount, brokerId);

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
  const ownerHex = "0x" + owner.toString(16).padStart(64, "0");
  console.log("Owner of tokenId", tokenId, "is", ownerHex);

  console.log(`=> Creating order`);
  // Define the order details
  const order: ListingV1 = {
    brokerId, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: tokenId, // The ID of the token
    startAmount: 100000000000000000 // The starting amount for the order
  };

  console.log("=> Creating listing...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    order,
    approveInfo: {
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId
    }
  });
  console.log("orderHash", orderHash);
  console.log("=> Fetching order status...");
  const { orderStatus } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", orderStatus);
})();
