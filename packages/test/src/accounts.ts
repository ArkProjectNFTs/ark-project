import { MockConnector } from "@starknet-react/core";
import { Account, AccountInterface, ProviderInterface } from "starknet";

import { config } from "./config.js";

function fetchAccount(
  provider: ProviderInterface,
  address: string | undefined,
  privateKey: string | undefined,
  accountName: string
): AccountInterface {
  if (!address || !privateKey) {
    throw new Error(
      `Missing address or private key for account: ${accountName}`
    );
  }
  try {
    return new Account(provider, address, privateKey);
  } catch (error) {
    throw new Error(`Error creating account for ${accountName}: ${error}`);
  }
}

export function getAccounts(): {
  arkDefaultFeesReceiver: AccountInterface;
  arkSetbyAdminCollectionReceiver: AccountInterface;
  arkCollection2981Receiver: AccountInterface;
  admin: AccountInterface;
  listingBroker: AccountInterface;
  saleBroker: AccountInterface;
  offerer: AccountInterface;
  fulfiller: AccountInterface;
  seller: AccountInterface;
  buyer: AccountInterface;
} {
  return {
    arkDefaultFeesReceiver: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ARK_RECEIVER_ADDRESS,
      process.env.STARKNET_ARK_RECEIVER_PRIVATE_KEY,
      "arkDefaultFeesReceiver"
    ),
    arkSetbyAdminCollectionReceiver: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ARK_COLLECTION_RECEIVER_ADDRESS,
      process.env.STARKNET_ARK_COLLECTION_RECEIVER_PRIVATE_KEY,
      "arkSetbyAdminCollectionReceiver"
    ),
    arkCollection2981Receiver: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_ADDRESS,
      process.env.STARKNET_ARK_COLLECTION_2981_RECEIVER_PRIVATE_KEY,
      "arkCollection2981Receiver"
    ),
    admin: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ADMIN_ADDRESS_DEV,
      process.env.STARKNET_ADMIN_PRIVATE_KEY_DEV,
      "admin"
    ),
    listingBroker: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_LISTING_BROKER_ACCOUNT_ADDRESS,
      process.env.STARKNET_LISTING_BROKER_ACCOUNT_PRIVATE_KEY,
      "listingBroker"
    ),
    saleBroker: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_SALE_BROKER_ACCOUNT_ADDRESS,
      process.env.STARKNET_SALE_BROKER_ACCOUNT_PRIVATE_KEY,
      "saleBroker"
    ),
    offerer: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY,
      "offerer"
    ),
    fulfiller: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY,
      "fulfiller"
    ),
    seller: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY,
      "seller"
    ),
    buyer: fetchAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY,
      "buyer"
    )
  };
}

export function getDefaultConnector() {
  const accounts = getAccounts();
  const accountsArray = Object.values(accounts);

  return new MockConnector({
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
}
