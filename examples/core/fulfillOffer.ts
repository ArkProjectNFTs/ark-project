/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import { stark } from "starknet";

import "dotenv/config";

import {
  approveERC20,
  approveERC721,
  createAccount,
  createBroker,
  createOffer,
  fetchOrCreateAccount,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "@ark-project/core";

import { config } from "./config/index.js";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "./constants/index.js";
import { getCurrentTokenId } from "./utils/getCurrentTokenId.js";
import { mintERC20 } from "./utils/mintERC20.js";
import { mintERC721 } from "./utils/mintERC721.js";
import { whitelistBroker } from "./utils/whitelistBroker.js";

/**
 * Creates a listing on the blockchain using provided order details.
 */
(async () => {
  console.log(`=> Getting config...`);
  const { arkProvider, starknetProvider } = config;
  const brokerId = stark.randomAddress();
  await createBroker(config, { brokerID: brokerId });

  const solisAdminAccount = await fetchOrCreateAccount(
    config.arkProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
  );

  await whitelistBroker(config, solisAdminAccount, brokerId);

  console.log(`=> Creating account`);
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(arkProvider);

  console.log(
    `=> Fetching or creating fulfiller starknet account, for test purpose only`
  );
  const starknetFulfillerAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
  );

  console.log(
    `=> Minting token at contract address: ${STARKNET_NFT_ADDRESS} with fulfiller account: ${starknetFulfillerAccount.address}`
  );
  await mintERC721(starknetProvider, starknetFulfillerAccount);
  if (config.starknetNetwork !== "dev") {
    console.log(
      "=> Waiting for 5 minutes for transaction complete on goerli..."
    );
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
  }

  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  console.log("=> Token minted with tokenId: ", tokenId);

  console.log(`=> Creating offer for tokenId: ${tokenId}`);
  // Define the order details
  const offer: OfferV1 = {
    brokerId, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: tokenId, // The ID of the token
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

  if (process.env.STARKNET_NETWORK_ID === "dev") {
    console.log("=> Minting ERC20...");
    await mintERC20(
      starknetProvider,
      starknetOffererAccount,
      offer.startAmount
    );
  }

  console.log(
    `=> Approuving ERC20 tokens ${STARKNET_ETH_ADDRESS} from minter: ${starknetOffererAccount.address} to ArkProject executor`
  );
  await approveERC20(config, {
    starknetAccount: starknetOffererAccount,
    contractAddress: STARKNET_ETH_ADDRESS,
    amount: offer.startAmount
  });

  console.log("=> Creating offer...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createOffer(config, {
    starknetAccount: starknetOffererAccount,
    offer,
    approveInfo: {
      currencyAddress: STARKNET_ETH_ADDRESS,
      amount: offer.startAmount
    }
  });

  console.log(`=> Approving collection ${offer.tokenId}`);
  await approveERC721(config, {
    contractAddress: STARKNET_NFT_ADDRESS,
    starknetAccount: starknetFulfillerAccount,
    tokenId
  });

  if (config.starknetNetwork !== "dev") {
    console.log(
      "=> Waiting for 5 minutes for transaction complete on goerli..."
    );
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
  }

  // Define the fulfill details
  const fulfillOfferInfo = {
    orderHash: orderHash,
    tokenAddress: offer.tokenAddress,
    tokenId: offer.tokenId,
    brokerId
  };

  console.log(`=> Fulfilling offer by ${starknetFulfillerAccount.address}`);
  // fulfill the order
  await fulfillOffer(config, {
    starknetAccount: starknetFulfillerAccount,
    fulfillOfferInfo,
    approveInfo: {
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId: tokenId
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("=> Fetching order status...");
  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", orderStatusAfter);
})();
