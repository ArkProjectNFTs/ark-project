import { Network } from "../../src";
import {
  STARKNET_NFT_ADDRESS_DEV,
  STARKNET_NFT_ADDRESS_MAINNET,
  STARKNET_NFT_ADDRESS_TESTNET
} from "./contracts";

const NETWORK_TO_ADDRESS_MAP = {
  mainnet: STARKNET_NFT_ADDRESS_MAINNET,
  testnet: STARKNET_NFT_ADDRESS_TESTNET,
  dev: STARKNET_NFT_ADDRESS_DEV
};

export function getExampleNFTAddress(network: Network) {
  return NETWORK_TO_ADDRESS_MAP[network];
}
