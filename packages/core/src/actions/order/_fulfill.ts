import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  CairoCustomEnum,
  CallData,
  RpcProvider
} from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";
import { getSignInfos } from "../../signer";
import { FulfillInfo } from "../../types";

/**
 * Creates an order on the Arkchain with specific constraints based on order type.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 * @param {Account} account - The account used to sign and send the transaction.
 * @param {FulfillInfo} fulfillInfo - The order object with essential details.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 * @throws {Error} Throws an error if the ABI or order type is invalid.
 */
const _fulfillOrder = async (
  provider: RpcProvider,
  starknetFulfillerAccount: AccountInterface,
  arkFulfillerAccount: Account,
  fulfillInfo: FulfillInfo,
  owner?: string
) => {
  // Compile the order data
  let compiledOrder = CallData.compile({
    fulfillInfo
  });
  let compiletOrderBigInt = compiledOrder.map(BigInt);

  const TypedOrderData = {
    message: {
      hash: starknet.poseidonHashMany(compiletOrderBigInt).toString()
    },
    domain: {
      name: "Ark",
      chainId: "SN_MAIN",
      version: "1.1"
    },
    types: {
      StarkNetDomain: [
        { name: "name", type: "felt252" },
        { name: "chainId", type: "felt252" },
        { name: "version", type: "felt252" }
      ],
      Order: [{ name: "hash", type: "felt252" }]
    },
    primaryType: "Order"
  };

  const signInfo = await getSignInfos(
    TypedOrderData,
    starknetFulfillerAccount,
    owner
  );
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });

  let fulfillInfoCalldata = CallData.compile({
    fulfill_info: fulfillInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await arkFulfillerAccount.execute({
    contractAddress: ORDER_BOOK_ADDRESS,
    entrypoint: "fulfill_order",
    calldata: fulfillInfoCalldata
  });

  // Wait for the transaction to be processed
  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { _fulfillOrder };
