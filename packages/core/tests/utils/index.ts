import {
  Account,
  cairo,
  CairoCustomEnum,
  Contract,
  ProviderInterface
} from "starknet";

import contracts from "../../../../contracts.dev.json";
import { Config, createConfig } from "../../src/createConfig.js";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

export const STARKNET_NFT_ADDRESS = contracts.nftContract;

export const FEE_TOKEN =
  "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export { contracts };

export const config = createConfig({
  starknetNetwork: "dev",
  starknetExecutorContract: contracts.executor,
  starknetCurrencyContract: contracts.eth
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
