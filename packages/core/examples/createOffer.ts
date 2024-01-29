/**
 * Demonstrates how to use the Starknet SDK for creating a offer on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a offer order
 * checking the order status
 */

import { shortString } from "starknet";

import "dotenv/config";

import {
  approveERC20,
  createAccount,
  createOffer,
  fetchOrCreateAccount,
  getOrderStatus,
  OfferV1
} from "../src";
import { config } from "./config";
import { STARKNET_ETH_ADDRESS, STARKNET_NFT_ADDRESS } from "./constants";
import { mintERC20 } from "./utils/mintERC20";

/**
 * Creates a offer on the blockchain using provided order details.
 */
(async () => {
  console.log(`=> Getting config...`);
  const { arkProvider, starknetProvider } = config;

  console.log(`=> Creating account`);
  // Create a new account for the offer using the provider
  const { account: arkAccount } = await createAccount(arkProvider);

  console.log(
    `=> Fetching or creating offerer starknet account, for test purpose only`
  );
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  console.log(`=> Creating order`);
  // Define the offer details
  const offer: OfferV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: 20, // The ID of the token
    startAmount: 100000000000000000 // The starting amount for the order
  };

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

  console.log("=> Creating Offer...");
  // Create the offer on the arkchain using the order details
  const orderHash = await createOffer(config, {
    starknetAccount: starknetOffererAccount,
    arkAccount,
    offer
  });

  console.log("=> Fetching order status...");
  const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
    orderHash
  });

  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})();
