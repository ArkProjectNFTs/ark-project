# ArkChain SDK Library

The ArkChain SDK is a comprehensive TypeScript/JavaScript library designed to interact with the ArkChain orderbook. It simplifies the process of performing various blockchain operations such as creating accounts, listings, offers, and more.

## Features

- Account Creation (Burner Wallets)
- Listing Creation
- Offer Creation
- Order Cancellation
- Fulfilling Listings and Offers

## Installation

```bash
npm install @arkproject/core
```

# Development

## install dependencies

```bash
pnpm install
```

## Running tests

```bash
pnpm run test
```

## Running examples

```bash
npx ts-node examples/createAccount.ts
```

```bash
npx ts-node examples/createListing.ts
```

```bash
npx ts-node examples/createOffer.ts
```

```bash
npx ts-node examples/cancelListing.ts
```

```bash
npx ts-node examples/fulfillListing.ts
```

```bash
npx ts-node examples/fulfillOffer.ts
```

## Usage

### Creating an Account

To create a new account, initialize the `RpcProvider` with the ArkChain node URL, and then use the `createAccount` function. This will return an object containing the account details.

```typescript
import { createAccount } from "arkchain-sdk";
import { RpcProvider } from "starknet";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function createNewAccount() {
  const { account } = await createAccount(provider);
  // Use the account object as needed
}

createNewAccount();
```

### Creating a Listing

To create a listing on the ArkChain, initialize the `RpcProvider`, create an account, and then use the `createListing` function with the specified order details.

```typescript
import { createAccount, createListing } from "arkchain-sdk";
import { ListingV1 } from "arkchain-sdk/types";
import { RpcProvider } from "starknet";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function createNewListing() {
  // Create a new account using the provider
  const { account } = await createAccount(provider);

  // Define the order details
  let order: ListingV1 = {
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 909, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the listing on the blockchain using the order details
  await createListing(provider, account, order);
}

createNewListing();
```

### Creating an Offer

To create an offer on the ArkChain, you'll need to initialize the `RpcProvider`, create an account, and then use the `createOffer` function with your offer details.

```typescript
import { createAccount, createOffer } from "arkchain-sdk";
import { OfferV1 } from "arkchain-sdk/types";
import { RpcProvider } from "starknet";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function createNewOffer() {
  // Create a new account using the provider
  const { account } = await createAccount(provider);

  // Define the order details
  let order: OfferV1 = {
    brokerId: 123, // The broker ID
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
    tokenId: 37, // The ID of the token
    startAmount: 600000000000000000 // The starting amount for the order
  };

  // Create the offer on the blockchain using the order details
  await createOffer(provider, account, order);
}

createNewOffer();
```

### Cancelling an Order

To cancel an order on the ArkChain, use the `cancelOrder` function with the necessary cancellation details, including the order hash, token address, and token ID. This example assumes that you already have an `orderHash` from a previously created order and you are using the account that created the listing or the offer.

```typescript
import { RpcProvider } from "starknet";
import { createAccount, cancelOrder } from "arkchain-sdk";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function cancelExistingOrder(orderHash, tokenAddress, tokenId, account) {
  // Use the account that created the listing or the offer

  // Define the cancel details
  const cancelInfo = {
    order_hash: orderHash,
    token_address: tokenAddress,
    token_id: tokenId
  };

  // Cancel the order
  await cancelOrder(provider, account, cancelInfo);
}

// Example usage (replace with actual orderHash, tokenAddress, tokenId, and account)
const orderHash = "your_order_hash_here";
const tokenAddress = "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672";
const tokenId = 6;
const account = /* account object from createAccount or similar method */;

cancelExistingOrder(orderHash, tokenAddress, tokenId, account);
```

### Fulfilling a Listing

To fulfill a listing on the ArkChain, use the `fulfillListing` function with the necessary details, including the order hash, token address, and token ID. This example assumes that you already have an `orderHash` from a previously created listing and you are using a separate account to fulfill it.

```typescript
import { RpcProvider } from "starknet";
import { createAccount, fulfillListing } from "arkchain-sdk";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function fulfillExistingListing(orderHash, tokenAddress, tokenId, fulfillerAccount) {
  // Use a separate account to fulfill the listing
  // The fulfillerAccount should be different from the listing creator's account

  // Define the fulfill details
  const fulfillInfo = {
    order_hash: orderHash,
    token_address: tokenAddress,
    token_id: tokenId
  };

  // Fulfill the listing
  await fulfillListing(provider, fulfillerAccount, fulfillInfo);
}

// Example usage (replace with actual orderHash, tokenAddress, tokenId, and fulfillerAccount)
const orderHash = "your_order_hash_here";
const tokenAddress = "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672";
const tokenId = 16;
const fulfillerAccount = /* account object from createAccount or similar method */;

fulfillExistingListing(orderHash, tokenAddress, tokenId, fulfillerAccount);
```

### Fulfilling an Offer

To fulfill an offer on the ArkChain, the original owner of the listing must use the `fulfillOffer` function. This function requires details including the order hash, token address, and token ID. This example assumes that you have an `orderHash` from a previously created offer and that you are the original owner of the listing.

```typescript
import { RpcProvider } from "starknet";
import { createAccount, fulfillOffer } from "arkchain-sdk";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

async function fulfillExistingOffer(orderHash, tokenAddress, tokenId, ownerAccount) {
  // Ensure the ownerAccount is the original owner of the listing

  // Define the fulfill details
  const fulfillInfo = {
    order_hash: orderHash,
    token_address: tokenAddress,
    token_id: tokenId
  };

  // Fulfill the offer as the original owner
  await fulfillOffer(provider, ownerAccount, fulfillInfo);
}

// Example usage (replace with actual orderHash, tokenAddress, tokenId, and ownerAccount)
const orderHash = "your_order_hash_here";
const tokenAddress = "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672";
const tokenId = 36;
const ownerAccount = /* account object of the listing's original owner */;

fulfillExistingOffer(orderHash, tokenAddress, tokenId, ownerAccount);
```
