import { Account, CallData, ec, hash, RpcProvider, stark } from "starknet";

import { ACCOUNT_CLASS_HASH } from "../../constants";

import "dotenv/config";

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
const createAccount = async (provider: RpcProvider) => {
  const accountClassHash = ACCOUNT_CLASS_HASH;
  const privateKey = stark.randomAddress();
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const address = hash.calculateContractAddressFromHash(
    publicKey,
    accountClassHash,
    CallData.compile({ publicKey }),
    0
  );
  const account = new Account(provider, address, privateKey);
  const { transaction_hash, contract_address } = await account.deployAccount(
    {
      classHash: accountClassHash,
      constructorCalldata: CallData.compile({ publicKey }),
      addressSalt: publicKey
    },
    {
      maxFee: "0x0"
    }
  );
  await provider.waitForTransaction(transaction_hash, {
    retryInterval: 100
  });
  return {
    address: contract_address,
    privateKey,
    publicKey,
    account
  };
};

export { createAccount };
