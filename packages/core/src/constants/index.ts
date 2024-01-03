/* eslint-disable no-unused-vars */
import * as contracts from "./contracts";

export const SOLIS_ACCOUNT_CLASS_HASH =
  "0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";
export const STARKNET_ADMIN_ACCOUNT_ADDRESS =
  "0x765149d6bc63271df7b0316537888b81aa021523f9516a05306f10fd36914da";

export type ArkChainContractType = "ORDERBOOK";

export enum Network {
  Mainnet = "mainnet",
  Testnet = "testnet",
  Dev = "dev"
}

const NETWORK_CONTRACT_ADDRESSES = {
  [Network.Dev]: {
    SOLIS_ORDER_BOOK_ADDRESS: contracts.SOLIS_ORDER_BOOK_ADDRESS_DEV,
    STARKNET_ETH_ADDRESS: contracts.STARKNET_ETH_ADDRESS_DEV,
    STARKNET_EXECUTOR_ADDRESS: contracts.STARKNET_EXECUTOR_ADDRESS_DEV
  },
  [Network.Testnet]: {
    SOLIS_ORDER_BOOK_ADDRESS: contracts.SOLIS_ORDER_BOOK_ADDRESS_TESTNET,
    STARKNET_ETH_ADDRESS: contracts.STARKNET_ETH_ADDRESS_TESTNET,
    STARKNET_EXECUTOR_ADDRESS: contracts.STARKNET_EXECUTOR_ADDRESS_TESTNET
  },
  [Network.Mainnet]: {
    SOLIS_ORDER_BOOK_ADDRESS: contracts.SOLIS_ORDER_BOOK_ADDRESS_MAINNET,
    STARKNET_ETH_ADDRESS: contracts.STARKNET_ETH_ADDRESS_MAINNET,
    STARKNET_EXECUTOR_ADDRESS: contracts.STARKNET_EXECUTOR_ADDRESS_MAINNET
  }
};

export function getContractAddresses(network: Network) {
  return NETWORK_CONTRACT_ADDRESSES[network];
}
