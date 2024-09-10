import { Contract } from "starknet";
import { toHex } from "viem";

import { Config } from "../../createConfig.js";

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
    name: "get_default_creator_fees",
    inputs: [],
    outputs: [
      {
        type: "(core::starknet::contract_address::ContractAddress, ark_oz::erc2981::fees::FeesRatio)"
      }
    ],
    state_mutability: "view"
  }
] as const;

export async function getDefaultCreatorFees(config: Config) {
  const contract = new Contract(
    ABI,
    config.starknetExecutorContract,
    config.starknetProvider
  ).typedv2(ABI);

  const raw = await contract.get_default_creator_fees();
  const creator = toHex(raw[0] as bigint);
  const { numerator, denominator } = raw[1] as {
    numerator: bigint;
    denominator: bigint;
  };

  return {
    creator,
    fees: {
      formatted: ((Number(numerator) / Number(denominator)) * 100).toFixed(2),
      numerator,
      denominator
    }
  };
}
