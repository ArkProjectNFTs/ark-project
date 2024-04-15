import {
  Account,
  CallData,
  ec,
  hash,
  ProviderInterface,
  stark
} from "starknet";

import { SOLIS_ACCOUNT_CLASS_HASH } from "../../constants";

/**
 * Creates a new account on the StarkNet testnet.
 * This function generates a private key, derives the corresponding public key,
 * calculates the account address using the StarkNet protocol, and then deploys
 * the account on the StarkNet testnet.
 *
 * @param provider An instance of RpcProvider to interact with the StarkNet network.
 *
 * @returns A Promise that resolves to an object containing:
 * - `address`: The StarkNet address of the newly created account.
 * - `privateKey`: The private key of the account.
 * - `publicKey`: The public key corresponding to the private key.
 * - `burner`: An instance of Account that can be used to interact with the account.
 *
 * @example
 * const provider = new RpcProvider("testnet url");
 * createAccount(provider).then(account => {
 *   console.log(account.address);
 *   console.log(account.privateKey);
 *   console.log(account.publicKey);
 *   console.log(account.burner);
 * });
 */
export const createAccount = async (provider: ProviderInterface) => {
  const accountClassHash = SOLIS_ACCOUNT_CLASS_HASH;
  const privateKey = stark.randomAddress();
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const address = hash.calculateContractAddressFromHash(
    publicKey,
    accountClassHash,
    CallData.compile({ publicKey }),
    0
  );
  const account = new Account(provider, address, privateKey, "1");
  const { transaction_hash, contract_address } = await account.deployAccount({
    classHash: accountClassHash,
    constructorCalldata: CallData.compile({ publicKey }),
    addressSalt: publicKey
  });
  await provider.waitForTransaction(transaction_hash, {
    retryInterval: 1000
  });
  return {
    address: contract_address,
    privateKey,
    publicKey,
    account
  };
};

/**
 * Asynchronously fetches an existing account or creates a new one based on the provided parameters.
 *
 * @param {ProviderInterface} provider - The RPC provider to interact with the blockchain.
 * @param {string} [accountAddress] - The address of the existing account, if any.
 * @param {string} [accountPrivateKey] - The private key of the existing account, if any.
 * @returns {Promise<Account>} - The existing or newly created account.
 *
 * This function checks if both account address and private key are provided. If not, it creates a new account using the provided provider.
 * If both are provided, it initializes and returns an existing account with the given credentials.
 */
export async function fetchOrCreateAccount(
  provider: ProviderInterface,
  accountAddress?: string,
  accountPrivateKey?: string
): Promise<Account> {
  if (!accountAddress || !accountPrivateKey) {
    const { account } = await createAccount(provider);
    return account;
  } else {
    return new Account(provider, accountAddress, accountPrivateKey, "1");
  }
}
