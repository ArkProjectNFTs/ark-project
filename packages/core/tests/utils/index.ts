import {
  Account,
  cairo,
  CairoCustomEnum,
  Call,
  CallData,
  Contract
} from "starknet";

import contracts from "../../../../contracts.dev.json";
import { Config, createConfig } from "../../src/createConfig.js";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

export const STARKNET_NFT_ADDRESS = contracts.nftContract;

export const config = createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth,
  arkchainNetwork: "dev",
  arkchainOrderbookContract: contracts.orderbook
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
  brokerId: string
) => {
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainOrderbookContract
  );

  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const whitelist_hash_calldata = CallData.compile({
    broker_id: brokerId
  });

  const result = await adminAccount.execute({
    contractAddress: config.arkchainOrderbookContract,
    entrypoint: "whitelist_broker",
    calldata: whitelist_hash_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return result;
};

export const mintERC20 = async ({
  account,
  amount
}: {
  account: Account;
  amount: number;
}) => {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetCurrencyContract
  );

  if (!abi) {
    throw new Error("no abi.");
  }

  const mintERC20Call: Call = {
    contractAddress: config.starknetCurrencyContract,
    entrypoint: "mint",
    calldata: CallData.compile([account.address, cairo.uint256(amount)])
  };

  const result = await account.execute(mintERC20Call, [abi]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return result.transaction_hash;
};

export async function mintERC721({ account }: { account: Account }) {
  const { abi } = await config.starknetProvider.getClassAt(
    contracts.nftContract
  );

  if (!abi) {
    throw new Error("no abi.");
  }

  const contract = new Contract(
    abi,
    contracts.nftContract,
    config.starknetProvider
  );
  const tokenId: bigint = await contract.get_current_token_id();

  const mintCall: Call = {
    contractAddress: contracts.nftContract,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: account.address,
      token_uri: `https://api.everai.xyz/m/1`
    })
  };

  const { transaction_hash } = await account.execute(mintCall, [abi]);

  await config.starknetProvider.waitForTransaction(transaction_hash, {
    retryInterval: 1000
  });

  return tokenId;
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

export const getBalance = async ({ account }: { account: Account }) => {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetCurrencyContract
  );

  if (!abi) {
    throw new Error("no abi.");
  }

  const contract = new Contract(
    abi,
    config.starknetCurrencyContract,
    config.starknetProvider
  );

  const balance: bigint = await contract.balanceOf(account.address);

  return balance;
};

export const setBrokerFees = async (
  config: Config,
  deployerAccount: Account,
  starknetAddress: string,
  brokerAddress: string,
  fees: number
) => {
  const { abi } = await config.starknetProvider.getClassAt(starknetAddress);

  if (!abi) {
    throw new Error("no abi.");
  }

  const executorContract = new Contract(
    abi,
    starknetAddress,
    config.starknetProvider
  );

  executorContract.connect(deployerAccount);

  const response = await executorContract.set_broker_fees(
    brokerAddress,
    cairo.uint256(fees)
  );

  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};

export const setArkFees = async (
  config: Config,
  deployerAccount: Account,
  starknetAddress: string,
  fees: number
) => {
  const { abi } = await config.starknetProvider.getClassAt(starknetAddress);

  if (!abi) {
    throw new Error("no abi.");
  }

  const executorContract = new Contract(
    abi,
    starknetAddress,
    config.starknetProvider
  );

  executorContract.connect(deployerAccount);

  const response = await executorContract.set_ark_fees(cairo.uint256(fees));

  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};

export const setFees = async ({
  config,
  adminAccount,
  executorAddress,
  brokerId,
  brokerFee,
  arkFee
}: {
  config: Config;
  adminAccount: Account;
  executorAddress: string;
  brokerId: string;
  brokerFee: number;
  arkFee: number;
}) => {
  await setBrokerFees(
    config,
    adminAccount,
    contracts.executor,
    brokerId,
    brokerFee
  );
  await setArkFees(config, adminAccount, executorAddress, arkFee);
};
