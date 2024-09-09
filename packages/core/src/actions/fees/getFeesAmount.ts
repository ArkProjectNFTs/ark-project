import { cairo, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetFeesAmountParameters {
  fulfillBroker: string;
  listingBroker: string;
  nftAddress: string;
  nftTokenId: bigint;
  paymentAmount: bigint;
}

export const GET_FEES_AMOUNT_ABI = [
  {
    "name": "ark_starknet::interfaces::FeesAmount",
    "type": "struct",
    "members": [
      {
        "name": "fulfill_broker",
        "type": "core::integer::u256"
      },
      {
        "name": "listing_broker",
        "type": "core::integer::u256"
      },
      {
        "name": "ark",
        "type": "core::integer::u256"
      },
      {
        "name": "creator",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "name": "get_fees_amount",
    "type": "function",
    "inputs": [
      {
        "name": "fulfill_broker",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "listing_broker",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "nft_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "nft_token_id",
        "type": "core::integer::u256"
      },
      {
        "name": "payment_amount",
        "type": "core::integer::u256"
      }
    ],
    "outputs": [
      {
        "type": "ark_starknet::interfaces::FeesAmount"
      }
    ],
    "state_mutability": "view"
  }
] as const;

export async function getFeesAmount(
  config: Config,
  parameters: GetFeesAmountParameters
) {
  const contract = new Contract(
    GET_FEES_AMOUNT_ABI,
    config.starknetExecutorContract,
    config.starknetProvider
  ).typedv2(GET_FEES_AMOUNT_ABI);

  const callData = CallData.compile({
    fulfill_broker: parameters.fulfillBroker,
    listing_broker: parameters.listingBroker,
    nft_address: parameters.nftAddress,
    nft_token_id: cairo.uint256(parameters.nftTokenId),
    payment_amount: cairo.uint256(BigInt(parameters.paymentAmount))
  });

  const fees = await contract.get_fees_amount(callData);

  return {
    ark: fees.ark,
    creator: fees.creator,
    fulfillBroker: fees.fulfill_broker,
    listingBroker: fees.listing_broker
  };
}
