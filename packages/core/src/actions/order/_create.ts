import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  CairoCustomEnum,
  CallData,
  shortString
} from "starknet";

import { Config } from "../../createConfig.js";
import { getSignInfos } from "../../signer/index.js";
import { OrderV1 } from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";

interface CreateOrderParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  order: OrderV1;
  owner?: string;
}

/**
 * Creates an order on the Arkchain with specific constraints based on order type.
 *
 * This function compiles the order data, signs it using the provided Starknet account,
 * and executes the transaction through the Arkchain account. It's used internally by
 * createListing and createOffer to handle the transactional part of order creation.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {CreateOrderParameters} parameters - The parameters for creating the order,
 * including the Starknet and Arkchain accounts, the order details, and an optional owner address.
 *
 * @returns {Promise<string>} A promise that resolves with the hash of the created order.
 *
 */
const createOrder = async (
  config: Config,
  parameters: CreateOrderParameters
) => {
  const { starknetAccount, arkAccount, order, owner } = parameters;
  const compiledOrder = CallData.compile({
    order
  });
  const compiledOrderBigInt = compiledOrder.map(BigInt);
  const TypedOrderData = {
    message: {
      hash: starknet.poseidonHashMany(compiledOrderBigInt).toString()
    },
    domain: {
      name: "Ark",
      chainId: shortString.decodeShortString(order.currencyChainId.toString()),
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
  const create_order_calldata = CallData.compile({
    order: order,
    signer: signer
  });
  const result = await arkAccount.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "create_order",
    calldata: create_order_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  const orderHash = getOrderHashFromOrderV1(order);

  return orderHash;
};

export { createOrder };
