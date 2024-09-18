import { CallData, Contract } from "starknet";
import { toHex } from "viem";

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
    name: "get_collection_creator_fees",
    inputs: [
      {
        name: "nft_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [
      {
        type: "(core::starknet::contract_address::ContractAddress, ark_oz::erc2981::fees::FeesRatio)"
      }
    ],
    state_mutability: "view"
  }
] as const;

export async function getCollectionCreatorFees(
  config: Config,
  tokenAddress: string
) {
  const contract = new Contract(
    ABI,
    config.starknetExecutorContract,
    config.starknetProvider
  ).typedv2(ABI);

  const raw = await contract.get_collection_creator_fees(
    CallData.compile({
      nft_address: tokenAddress
    })
  );
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
