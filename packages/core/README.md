# ArkChain SDK Examples

The ArkChain SDK is a comprehensive TypeScript/JavaScript library designed to interact with the ArkChain orderbook. This package contains example scripts demonstrating how to perform various blockchain operations such as creating accounts, listings, offers, and more.

## Features

- Account Creation (Burner Wallets)
- Listing Creation
- Offer Creation
- Order Cancellation
- Fulfilling Listings and Offers

## Installation

To install the ArkChain SDK, use the following command:

```bash
npm install @arkproject/core
```

## Development

### Install Dependencies

Before running the examples, make sure to install all necessary dependencies:

```bash
pnpm install
```

### Running Tests

To run tests, use the following command:

```bash
pnpm run test
```

### Running Examples

You can run each example script using Bun. Below are the commands to run each of the examples:

```bash
npx bun run src/createAccount.ts
```

```bash
npx bun run src/createListing.ts
```

```bash
npx bun run src/createOffer.ts
```

```bash
npx bun run src/cancelListing.ts
```

```bash
npx bun run src/fulfillListing.ts
```

```bash
npx bun run src/fulfillOffer.ts
```

## Usage

### Creating an Account

To create a new account, initialize the `RpcProvider` with the ArkChain node URL, and then use the `createAccount` function. This will return an object containing the account details.

```typescript
import { RpcProvider } from "starknet";

import { createAccount } from "@ark-project/core";

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
import { RpcProvider } from "starknet";

import { createAccount, createListing } from "@ark-project/core";
import { ListingV1 } from "@ark-project/core/types";

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
import { RpcProvider } from "starknet";

import { createAccount, createOffer } from "@ark-project/core";
import { OfferV1 } from "@ark-project/core/types";

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
