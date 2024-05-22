import {
  Account,
  BigNumberish,
  cairo,
  CairoCustomEnum,
  Call,
  CallData,
  Contract,
  ProviderInterface,
  RpcProvider
} from "starknet";

import contractsByNetworks from "../../../../contracts.json";
import { Config, createConfig, Network } from "../../src/createConfig.js";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

type StarknetContract = {
  eth: string;
  messaging: string;
  executor: string;
  nftContract: string;
};

const network = process.env.STARKNET_NETWORK_ID as Network;
const contracts = contractsByNetworks[network] as StarknetContract;
const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL ?? "localhost:5050"
});

export const STARKNET_ETH_ADDRESS = contracts.eth;
export const STARKNET_NFT_ADDRESS = contracts.nftContract;
export const STARKNET_EXECUTOR_ADDRESS = contracts.executor;

export const config = createConfig({
  starknetProvider: starknetProvider,
  starknetNetwork: "dev",
  arkchainNetwork: "dev"
});

export function generateRandomTokenId(): number {
  return Math.floor(Math.random() * 10000) + 1;
}

export function getTypeFromCairoCustomEnum(cairoCustomEnum: CairoCustomEnum) {
  const keyMap = {
    Listing: "LISTING",
    Auction: "AUCTION",
    Offer: "OFFER",
    CollectionOffer: "COLLECTION_OFFER"
  };

  for (const key in cairoCustomEnum.variant) {
    if (cairoCustomEnum.variant[key as VariantKey] !== undefined) {
      return keyMap[key as VariantKey] || "Unknown";
    }
  }

  throw new Error("No valid variant found in CairoCustomEnum");
}

export const whitelistBroker = async (
  config: Config,
  adminAccount: Account,
  brokerId: BigNumberish
) => {
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainContracts.orderbook
  );

  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const whitelist_hash_calldata = CallData.compile({
    broker_id: brokerId
  });

  const result = await adminAccount.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "whitelist_broker",
    calldata: whitelist_hash_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return result;
};

export const mintERC20 = async (
  provider: ProviderInterface,
  starknetAccount: Account,
  amount: BigNumberish
) => {
  const { abi: erc20abi } = await provider.getClassAt(STARKNET_ETH_ADDRESS);
  if (erc20abi === undefined) {
    throw new Error("no abi.");
  }

  const mintERC20Call: Call = {
    contractAddress: STARKNET_ETH_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile([starknetAccount.address, cairo.uint256(amount)])
  };

  const result = await starknetAccount.execute(mintERC20Call, [erc20abi]);
  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
  return result.transaction_hash;
};

export async function mintERC721(
  provider: ProviderInterface,
  starknetAccount: Account
) {
  const { abi: erc721abi } = await provider.getClassAt(STARKNET_NFT_ADDRESS);
  if (erc721abi === undefined) {
    throw new Error("no abi.");
  }

  const mintCall: Call = {
    contractAddress: STARKNET_NFT_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: starknetAccount.address,
      token_uri: `https://api.everai.xyz/m/1`
    })
  };

  const result = await starknetAccount.execute(mintCall, [erc721abi]);

  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
  return result.transaction_hash;
}

export const getCurrentTokenId = async (
  config: Config,
  nftContractAddress: string
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);

  if (!abi) {
    throw new Error("no abi.");
  }

  const nftContract = new Contract(
    abi,
    nftContractAddress,
    config.starknetProvider
  );

  const token_id = await nftContract.get_current_token_id();
  // we need to subtract 1 because the contract returns the next token id
  return token_id - BigInt(1);
};
