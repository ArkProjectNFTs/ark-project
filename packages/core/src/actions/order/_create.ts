import { Account, AccountInterface, cairo, CallData } from "starknet";

import { Config } from "../../createConfig";
import { OrderV1 } from "../../types";
import { getOrderHashFromOrderV1 } from "../../utils";

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
  const { starknetAccount, order } = parameters;

  const result = await starknetAccount.execute([
    {
      contractAddress: config.starknetContracts.nftContract,
      entrypoint: "approve",
      calldata: CallData.compile({
        to: config.starknetContracts.executor as string,
        token_id: cairo.uint256(1)
      })
    },
    {
      contractAddress: config.starknetContracts.executor,
      entrypoint: "create_order",
      calldata: CallData.compile({
        order: order
      })
    }
  ]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  const orderHash = getOrderHashFromOrderV1(order);

  return orderHash;
};

export { createOrder };
