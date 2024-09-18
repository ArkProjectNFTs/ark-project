import { Contract } from "starknet";

import type { Config } from "../../createConfig.js";

export const ABI = [
  {
    type: "struct",
    name: "ark_oz::erc2981::fees::FeesRatio",
    members: [
      { name: "numerator", type: "core::integer::u256" },
      { name: "denominator", type: "core::integer::u256" }
    ]
  },
  {
    type: "function",
    name: "get_ark_fees",
    inputs: [],
    outputs: [{ type: "ark_oz::erc2981::fees::FeesRatio" }],
    state_mutability: "view"
  }
] as const;

export async function getArkFees(config: Config) {
  const contract = new Contract(
    ABI,
    config.starknetExecutorContract,
    config.starknetProvider
  ).typedv2(ABI);

  const { numerator, denominator } = await contract.get_ark_fees();

  return {
    formatted: ((Number(numerator) / Number(denominator)) * 100).toFixed(2),
    numerator,
    denominator
  };
}
