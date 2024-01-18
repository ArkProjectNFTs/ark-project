import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  CairoCustomEnum,
  CallData,
  shortString
} from "starknet";

import { Config } from "../../createConfig";
import { getSignInfos } from "../../signer";
import { FulfillInfo } from "../../types";

interface fulfillOrderParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  fulfillInfo: FulfillInfo;
  owner?: string;
}

/**
 * Creates an order on the Arkchain with specific constraints based on order type.
 *
 * @param {Config} config - The core SDK config.
 * @param {Account} account - The account used to sign and send the transaction.
 * @param {FulfillInfo} fulfillInfo - The order object with essential details.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 * @throws {Error} Throws an error if the ABI or order type is invalid.
 */
export const _fulfillOrder = async (
  config: Config,
  parameters: fulfillOrderParameters
) => {
  const { starknetAccount, arkAccount, fulfillInfo, owner } = parameters;
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
      chainId: shortString.decodeShortString(
        fulfillInfo.token_chain_id.toString()
      ),
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

  const signInfo = await getSignInfos(TypedOrderData, starknetAccount, owner);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });

  let fulfillInfoCalldata = CallData.compile({
    fulfill_info: fulfillInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await arkAccount.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "fulfill_order",
    calldata: fulfillInfoCalldata
  });

  // Wait for the transaction to be processed
  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};
