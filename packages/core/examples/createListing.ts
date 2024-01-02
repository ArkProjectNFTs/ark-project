/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * and submitting a listing order.
 */

import { RpcProvider, shortString } from "starknet";

import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { createListing } from "../src/actions/order";
import { getOrderHash, getOrderStatus } from "../src/actions/read";
import { STARKNET_NFT_ADDRESS } from "../src/constants";
import { ListingV1 } from "../src/types";

// Initialize the RPC provider with the ArkChain node URL
const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL ?? "localhost:5050"
});

// Initialize the RPC provider with the katana node URL for starknet
const arkProvider = new RpcProvider({
  nodeUrl: process.env.ARKCHAIN_RPC_URL ?? "http://0.0.0.0:7777"
});

const katana0 = {
  privateKey: "0x1800000000300000180000000000030000000000003006001800006600",
  publicKey:
    "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
  accountAddress:
    "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973"
};

const katana1 = {
  privateKey:
    "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
  publicKey:
    "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
  accountAddress:
    "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855"
};

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async (arkProvider: RpcProvider, starknetProvider: RpcProvider) => {
  // Create a new account using the provider
  const { account: arkAccount } = await createAccount(arkProvider);
  const starknetAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT1_ADDRESS,
    process.env.ACCOUNT1_PRIVATE_KEY
  );
  // Define the order details
  let order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: 909, // The ID of the token
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
