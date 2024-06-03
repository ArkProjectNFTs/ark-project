/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import "dotenv/config";

import { stark } from "starknet";

import {
  approveERC20,
  approveERC721,
  createBroker,
  createListing,
  fetchOrCreateAccount,
  fulfillListing,
  getOrderStatus,
  ListingV1
} from "@ark-project/core";

import { config, nftContract } from "./config/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { mintERC20 } from "./utils/mintERC20.js";
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

  console.log(`=> Getting config...`);
  const { starknetProvider } = config;

  console.log(
    `=> Fetching or creating offerer starknet account, for test purpose only`
  );
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  console.log("=> Minting token at contract address: ", nftContract);
  const transaction_hash = await mintERC721(
    starknetProvider,
    starknetOffererAccount
  );

  console.log(transaction_hash);

  if (config.starknetNetwork !== "dev") {
    console.log("=> Waiting for 5 minutes for transaction complete...");
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
  }

  const tokenId = await getCurrentTokenId(config, nftContract);
  console.log("=> Token minted with tokenId: ", tokenId);

  console.log(`=> Approving for all`);
  await approveERC721(config, {
    contractAddress: nftContract,
    starknetAccount: starknetOffererAccount,
    tokenId
  });

  console.log(`=> Creating order`);
  // Define the order details
  const order: ListingV1 = {
    brokerId, // The broker ID
    tokenAddress: nftContract, // The token address
    tokenId: tokenId, // The ID of the token
    startAmount: BigInt(100000000000000000) // The starting amount for the order
  };

  console.log("=> Creating listing...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    order,
    approveInfo: {
      tokenAddress: nftContract,
      tokenId
    }
  });

  if (config.starknetNetwork !== "dev") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log(
    `=> Fetching or creating fulfiller starknet account, for test purpose only`
  );
  const starknetFulfillerAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
  );

  if (process.env.STARKNET_NETWORK_ID === "dev") {
    console.log("=> Minting ERC20...");
    await mintERC20(
      starknetProvider,
      starknetFulfillerAccount,
      order.startAmount
    );
  }

  console.log(
    `=> Approving ERC20 tokens ${config.starknetCurrencyContract} from minter: ${starknetFulfillerAccount.address} to ArkProject executor`
  );

  await approveERC20(config, {
    starknetAccount: starknetFulfillerAccount,
    contractAddress: config.starknetCurrencyContract,
    amount: order.startAmount
  });

  if (config.starknetNetwork !== "dev") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.log("tokenId", tokenId);
  console.log("orderHash", orderHash);
  // Define the fulfill details
  const fulfillListingInfo = {
    orderHash: orderHash,
    tokenAddress: order.tokenAddress,
    tokenId,
    brokerId
  };

  console.log(`=> Fulfilling listing by ${starknetFulfillerAccount.address}`);
  // fulfill the order
  await fulfillListing(config, {
    starknetAccount: starknetFulfillerAccount,
    fulfillListingInfo,
    approveInfo: {
      currencyAddress: config.starknetCurrencyContract,
      amount: order.startAmount
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("=> Fetching order status...");
  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", orderStatusAfter);
})();
