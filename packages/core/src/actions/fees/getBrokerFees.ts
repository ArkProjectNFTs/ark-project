import { CallData, Contract } from "starknet";

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
    name: "get_broker_fees",
    inputs: [
      {
        name: "broker_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [{ type: "ark_oz::erc2981::fees::FeesRatio" }],
    state_mutability: "view"
  }
] as const;

export async function getBrokerFees(config: Config, brokerAddress: string) {
  const contract = new Contract(
    ABI,
    config.starknetExecutorContract,
    config.starknetProvider
  ).typedv2(ABI);

  const { numerator, denominator } = await contract.get_broker_fees(
    CallData.compile({
      broker_address: brokerAddress
    })
  );

  return {
    formatted: ((Number(numerator) / Number(denominator)) * 100).toFixed(2),
    numerator,
    denominator
  };
}
