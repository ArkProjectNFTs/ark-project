# StarkNet Order Hashing and Signature Generation

This project contains utility scripts for creating cryptographic hashes anxd signatures for orders on the StarkNet blockchain. It is designed to work with StarkNet's specific requirements for signing and verifying transactions and other data structures.

## Features

- Generate Keccak hashes from order data.
- Sign order hashes with a private key to create a signature.
- Retrieve the StarkNet public key and full public key from a given private key.

## Prerequisites

To use these scripts, you will need:

- Node.js environment.
- A package manager like npm or yarn.
- TypeScript installed globally or in your project.

## Installation

First, install the dependencies:

```bash
pnpm install
```

## Usage

```
pnpm run dev
```

The `main` function (`index.ts`) encapsulates the process of signing a predefined order. To hash and sign a different order, you should update the order details within this function accordingly.
