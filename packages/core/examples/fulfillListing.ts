/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import {
  Account,
  cairo,
  CallData,
  RpcProvider,
  shortString,
  type BigNumberish
} from "starknet";

import "dotenv/config";

import {
  createAccount,
  fetchOrCreateAccount
} from "../src/actions/account/account";
import { approveERC20, approveERC721 } from "../src/actions/contract";
import { createListing, fulfillListing } from "../src/actions/order";
import { getOrderHash, getOrderStatus } from "../src/actions/read";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_EXECUTOR_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../src/constants";
import { ListingV1 } from "../src/types";

// Initialize the RPC provider with the ArkChain node URL
const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || ""
});

// Initialize the RPC provider with the katana node URL for starknet
const arkProvider = new RpcProvider({
  nodeUrl: process.env.ARKCHAIN_RPC_URL || ""
});

async function freeMint(
  provider: RpcProvider,
  starknetAccount: Account,
  tokenId: BigNumberish
) {
  const mintResult = await starknetAccount.execute({
    contractAddress: STARKNET_NFT_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: starknetAccount.address,
      token_id: cairo.uint256(tokenId)
    })
  });
  await provider.waitForTransaction(mintResult.transaction_hash);
}

/**
 * Creates a listing on the blockchain using provided order details.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 */
(async (arkProvider: RpcProvider, starknetProvider: RpcProvider) => {
  // Create a new account for the listing using the provider
  const { account: arkAccount } = await createAccount(arkProvider);

  // Define the order details
  let order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress: STARKNET_NFT_ADDRESS, // The token address
    tokenId: Math.floor(Math.random() * 10000) + 1, // The ID of the token
    startAmount: 100000000000000000 // The starting amount for the order
  };

  const starknetOffererAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );

  console.log("=> Minting token at contract address: ", STARKNET_NFT_ADDRESS);
  await freeMint(starknetProvider, starknetOffererAccount, order.tokenId);

  console.log(
    `=> Approving token ${order.tokenId} to ${STARKNET_EXECUTOR_ADDRESS}`
  );

  await approveERC721(
    starknetProvider,
    starknetOffererAccount,
    STARKNET_NFT_ADDRESS,
    STARKNET_EXECUTOR_ADDRESS,
    order.tokenId
  );

  console.log("=> Creating listing...");
  // Create the listing on the arkchain using the order details
  const orderHash = await createListing(
    arkProvider,
    starknetOffererAccount,
    arkAccount,
    order
  );

  // wait 5 seconds for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const starknetFulfillerAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
  );

  if (process.env.STARKNET_NETWORK_ID === "dev") {
    console.log("=> Minting ERC20...");
    const mintErc20Result = await starknetFulfillerAccount.execute({
      contractAddress: STARKNET_ETH_ADDRESS,
      entrypoint: "mint",
      calldata: CallData.compile({
        recipient: starknetFulfillerAccount.address,
        amount: cairo.uint256(1000000000000000000)
      })
    });

    await starknetProvider.waitForTransaction(mintErc20Result.transaction_hash);
  }

  console.log(
    `=> Approuving ERC20 tokens ${STARKNET_ETH_ADDRESS} from minter: ${starknetFulfillerAccount.address} to ${STARKNET_EXECUTOR_ADDRESS}`
  );
  await approveERC20(
    starknetProvider,
    starknetFulfillerAccount,
    STARKNET_ETH_ADDRESS,
    STARKNET_EXECUTOR_ADDRESS,
    BigInt(order.startAmount) + BigInt(1)
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Define the fulfill details
  const fulfill_info = {
    order_hash: orderHash,
    token_address: order.tokenAddress,
    token_id: order.tokenId
  };

  console.log(`=> Fulfilling listing by ${starknetFulfillerAccount.address}`);
  // fulfill the order
  fulfillListing(
    arkProvider,
    starknetFulfillerAccount,
    arkAccount,
    fulfill_info
  );

  console.log("=> Waiting for 10 seconds from transaction complete...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log("=> Fetching order status...");
  let { orderStatus: orderStatusAfter } = await getOrderStatus(
    orderHash,
    arkProvider
  );

  console.log("orderStatus", shortString.decodeShortString(orderStatusAfter));
})(arkProvider, starknetProvider);
