# Ark Project Smart Contracts

This repository contains the smart contracts for the Ark Project, a comprehensive suite designed for robust digital asset management.

## Overview of Contracts

### `ark_common`

A shared library utilized by both `ark_orderbook` and `ark_starknet` contracts, ensuring consistency and efficiency in operations.

### `ark_component` (Component)

- **Description**: Provide Orderbook smart contract component for the Ark Project.
- **Functionality**: Manages and processes asset orders within the Ark protocol.

### `ark_starknet`

- **Description**: Starknet's primary smart contract for the Ark Project.
- **Network**: Designed to run on the Starknet L2 network.
- **Functionality**: delegate assets orders management to `Orderbook` component and executes asset swap orders.

### `ark_oz` (Component)

- **Description**: Provide ERC2981 implementation.
- **Functionality**: Fees for a given collection/token

### `ark_tokens` (Testing Only)

- **Purpose**: Serves as a dummy token contract for Starknet within the Ark Project, aiding in test scenarios.
- **Tokens**:
  - `ERC20`: Standard ERC20 token implementation.
  - `ERC721`: Standard ERC721 token implementation.
  - `ERC721Royalty`: ERC721 token implementation with ERC2981 support (`ark_oz` component)

## Build Instructions

To build all the contracts in the workspace, run the following command:

```bash
scarb build --workspace
```
