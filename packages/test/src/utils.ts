import {
  Account,
  AccountInterface,
  cairo,
  CallData,
  Contract,
  type Call
} from "starknet";

import contracts from "../../../contracts.dev.json";
import { config } from "./config.js";

export async function wait(time: number) {
  return new Promise((res) => setTimeout(res, time));
}

const mintERC20ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u256"
      }
    ],
    outputs: [],
    state_mutability: "external"
  }
];

export async function mintERC20({
  account,
  amount = 1000
}: {
  account: Account | AccountInterface;
  amount: number;
}) {
  const mintERC20Call: Call = {
    contractAddress: config.starknetCurrencyContract,
    entrypoint: "mint",
    calldata: CallData.compile([account.address, cairo.uint256(amount)])
  };

  const result = await account.execute(mintERC20Call, [mintERC20ABI]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return {
    transactionHash: result.transaction_hash
  };
}

const mintERC721ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      { name: "token_uri", type: "core::felt252" }
    ],
    outputs: [],
    state_mutability: "external"
  },
  {
    type: "function",
    name: "get_current_token_id",
    inputs: [],
    outputs: [{ type: "core::felt252" }],
    state_mutability: "view"
  }
] as const;

export async function mintERC721({
  account
}: {
  account: Account | AccountInterface;
}) {
  const contract = new Contract(
    mintERC721ABI,
    contracts.nftContract,
    config.starknetProvider
  ).typedv2(mintERC721ABI);
  const tokenId = BigInt(await contract.get_current_token_id());
  const mintCall: Call = {
    contractAddress: contracts.nftContract,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: account.address,
      token_uri: `https://api.everai.xyz/m/1`
    })
  };

  const { transaction_hash } = await account.execute(mintCall, [mintERC721ABI]);

  await config.starknetProvider.waitForTransaction(transaction_hash, {
    retryInterval: 1000
  });

  return {
    tokenId,
    tokenAddress: contracts.nftContract
  };
}

const balanceOfERC20ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view"
  }
] as const;

export async function getBalance({
  account
}: {
  account: Account | AccountInterface;
}) {
  const contract = new Contract(
    balanceOfERC20ABI,
    config.starknetCurrencyContract,
    config.starknetProvider
  ).typedv2(balanceOfERC20ABI);

  const balance = await contract.balanceOf(account.address);

  return balance as bigint;
}
