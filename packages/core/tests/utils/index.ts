import {
  Account,
  cairo,
  CairoCustomEnum,
  Call,
  CallData,
  Contract,
  ProviderInterface
} from "starknet";

import contracts from "../../../../contracts.dev.json";
import { Config, createConfig } from "../../src/createConfig.js";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

export const STARKNET_NFT_ADDRESS = contracts.nftContract;

export { contracts };

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
  amount = 1000
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

  return {
    tokenId,
    tokenAddress: contracts.nftContract
  };
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

function fetchAccount(
  provider: ProviderInterface,
  address: string,
  privateKey: string
): Account {
  return new Account(provider, address, privateKey);
}

export const accounts = {
  arkDefaultFeesReceiver: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_RECEIVER_PRIVATE_KEY!
  ),
  arkSetbyAdminCollectionReceiver: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_COLLECTION_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_COLLECTION_RECEIVER_PRIVATE_KEY!
  ),
  arkCollection2981Receiver: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_ADDRESS!,
    process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_PRIVATE_KEY!
  ),
  admin: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ADMIN_ADDRESS_DEV!,
    process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV!
  ),
  listingBroker: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_ADDRESS!,
    process.env.STARKNET_LISTING_BROKER_ACCOUNT_PRIVATE_KEY!
  ),
  saleBroker: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_SALE_BROKER_ACCOUNT_ADDRESS!,
    process.env.STARKNET_SALE_BROKER_ACCOUNT_PRIVATE_KEY!
  ),
  offerer: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS!,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY!
  ),
  fulfiller: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS!,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY!
  ),
  seller: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS!,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY!
  ),
  buyer: fetchAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS!,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY!
  )
};

export const setCollectionCreatorFees = async (
  config: Config,
  adminAccount: Account,
  arkCollectionReceiver: string,
  fees: number,
  nftAddress: string
) => {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new Contract(
    abi,
    config.starknetExecutorContract,
    config.starknetProvider
  );
  executorContract.connect(adminAccount);
  const response = await executorContract.set_collection_creator_fees(
    nftAddress,
    arkCollectionReceiver,
    {
      numerator: cairo.uint256(fees),
      denominator: cairo.uint256(10000)
    }
  );
  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};

export const setDefaultCreatorFees = async (
  config: Config,
  deployerAccount: Account,
  arkReceiver: string,
  fees: number
) => {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new Contract(
    abi,
    config.starknetExecutorContract,
    config.starknetProvider
  );
  executorContract.connect(deployerAccount);
  const response = await executorContract.set_default_creator_fees(
    arkReceiver,
    {
      numerator: cairo.uint256(fees),
      denominator: cairo.uint256(10000)
    }
  );

  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};

// export async function setupFees(config: Config) {
//   await setArkFees(config, accounts.admin, 100);
//   await setBrokerFees(config, accounts.listingBroker, 100);
//   await setBrokerFees(config, accounts.saleBroker, 100);
//   await setDefaultCreatorFees(
//     config,
//     accounts.admin,
//     accounts.arkDefaultFeesReceiver.address,
//     100
//   );
//   await setCollectionCreatorFees(
//     config,
//     accounts.admin,
//     accounts.arkSetbyAdminCollectionReceiver.address,
//     100,
//     contracts.nftContractFixedFees
//   );
// }

// export async function resetFees(config: Config) {
//   await setArkFees(config, accounts.admin, 0);
//   await setBrokerFees(config, accounts.listingBroker, 0);
//   await setBrokerFees(config, accounts.saleBroker, 0);
//   await setDefaultCreatorFees(
//     config,
//     accounts.admin,
//     accounts.arkDefaultFeesReceiver.address,
//     0
//   );
//   await setCollectionCreatorFees(
//     config,
//     accounts.admin,
//     accounts.arkSetbyAdminCollectionReceiver.address,
//     0,
//     contracts.nftContractFixedFees
//   );
// }
