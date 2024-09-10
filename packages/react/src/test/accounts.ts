import { MockConnector } from "@starknet-react/core";
import { Account, AccountInterface, ProviderInterface } from "starknet";

import { config } from "./config";

function fetchAccount(
  provider: ProviderInterface,
  address: string,
  privateKey: string
): AccountInterface {
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

const accountsArray = Object.values(accounts).map((account) => account);

export const defaultConnector = new MockConnector({
  accounts: {
    mainnet: accountsArray,
    goerli: accountsArray
  },
  options: {
    id: "mock",
    name: "Mock Connector",
    icon: { dark: "https://example.com/icon.png" }
  }
});
