/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import "dotenv/config";

import {
  approveERC20,
  approveERC721,
  createAccount,
  createListing,
  fetchOrCreateAccount,
  ListingV1
} from "../src";
import { config } from "./config";
import { STARKNET_ETH_ADDRESS, STARKNET_NFT_ADDRESS } from "./constants";
import { mintERC20 } from "./utils/mintERC20";
import { mintERC721 } from "./utils/mintERC721";

/**
 * Creates a listing on the blockchain using provided order details.
 */
(async () => {
  console.log(`=> Getting config...`);
  const { arkProvider, starknetProvider } = config;

  console.log(`=> Creating account`);
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(arkProvider);

  console.log(`=> Creating order`);
  // Define the order details
  const order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: Math.floor(Math.random() * 10000) + 1, // The ID of the token
    startAmount: 100000000000000000 // The starting amount for the order
  };

  console.log(
    `=> Fetching or creating offerer starknet account, for test purpose only`
  );
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  console.log("=> Minting token at contract address: ", STARKNET_NFT_ADDRESS);
  await mintERC721(starknetProvider, starknetOffererAccount, order.tokenId);

  console.log(`=> Approving token ${order.tokenId}`);
  await approveERC721(config, {
    contractAddress: STARKNET_NFT_ADDRESS,
    tokenId: order.tokenId,
    starknetAccount: starknetOffererAccount
  });

  console.log("=> Creating listing...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    order
  });

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

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
    `=> Approuving ERC20 tokens ${STARKNET_ETH_ADDRESS} from minter: ${starknetFulfillerAccount.address} to ArkProject executor`
  );

  await approveERC20(config, {
    starknetAccount: starknetFulfillerAccount,
    contractAddress: STARKNET_ETH_ADDRESS,
    amount: order.startAmount
  });

  // await new Promise((resolve) => setTimeout(resolve, 2000));

  // // Define the fulfill details
  // const fulfillListingInfo = {
  //   order_hash: orderHash,
  //   token_address: order.tokenAddress,
  //   token_id: order.tokenId
  // };

  // console.log(`=> Fulfilling listing by ${starknetFulfillerAccount.address}`);
  // // fulfill the order
  // await fulfillListing(config, {
  //   starknetAccount: starknetFulfillerAccount,
  //   arkAccount,
  //   fulfillListingInfo
  // });

  // console.log("=> Waiting for 10 seconds from transaction complete...");
  // await new Promise((resolve) => setTimeout(resolve, 10000));

  // console.log("=> Fetching order status...");
  // const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
  //   orderHash
  // });

  // console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})();
