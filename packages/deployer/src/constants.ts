import { ProviderNetwork } from "./types";

export const STARKNET_NETWORK = (process.env.STARKNET_NETWORK_ID ||
  "dev") as ProviderNetwork;
export const SOLIS_NETWORK = (process.env.SOLIS_NETWORK_ID ||
  "dev") as ProviderNetwork;
