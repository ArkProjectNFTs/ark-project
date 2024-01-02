# Ark Project Smart Contracts

This repository contains the smart contracts for the Ark Project, a comprehensive suite designed for robust digital asset management.

## Overview of Contracts

### `ark_common`

A shared library utilized by both `ark_orderbook` and `ark_starknet` contracts, ensuring consistency and efficiency in operations.

### `ark_orderbook`

- **Description**: The central orderbook smart contract for the Ark Project.
- **Network**: Operates on the Solis L3 network.
- **Functionality**: Manages and processes asset orders within the Ark protocol.

### `ark_starknet`

- **Description**: Starknet's primary smart contract for the Ark Project.
- **Network**: Designed to run on the Starknet L2 network.
- **Components**:
  - **Messaging**: Facilitates communication between Solis, the orderbook and the executor smart contract.
  - **Executor**: Executes asset swap orders.

### `ark_tokens` (Testing Only)

- **Purpose**: Serves as a dummy token contract for Starknet within the Ark Project, aiding in test scenarios.
- **Tokens**:
  - `ERC20`: Standard ERC20 token implementation.
  - `ERC721`: Standard ERC721 token implementation.

### `solis`

- **Role**: Acts as a utility contract for Starknet on the Solis platform.
- **Key Feature**: Generates an ABI that enables Solis to interact seamlessly with Starknet contracts.

## Build Instructions

To build all the contracts in the workspace, run the following command:

```bash
scarb build --workspace
```
