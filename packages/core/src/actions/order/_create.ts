import { Account, CairoCustomEnum, CallData, RpcProvider } from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";
import { signMessage } from "../../signer";
import { OrderV1 } from "../../types";
import { getOrderHashFromOrderV1 } from "../../utils";

/**
 * Creates an order on the Arkchain with specific constraints based on order type.
 *
 * @param {RpcProvider} provider - The RPC provider instance.
 * @param {Account} account - The account used to sign and send the transaction.
 * @param {OrderV1} order - The order object with essential details.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 * @throws {Error} Throws an error if the ABI or order type is invalid.
 */
const createOrder = async (
  provider: RpcProvider,
  account: Account,
  order: OrderV1
) => {
  // Compile the order data
  let compiledOrder = CallData.compile({
    order
  });
  let compiletOrderBigInt = compiledOrder.map(BigInt);

  // Sign the compiled order
  const signInfo = signMessage(compiletOrderBigInt);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });

  // Compile calldata for the create_order function
  let create_order_calldata = CallData.compile({
    order: order,
    signer: signer
  });

  // Execute the transaction
  const result = await account.execute({
    contractAddress: ORDER_BOOK_ADDRESS,
    entrypoint: "create_order",
    calldata: create_order_calldata
  });

  // Wait for the transaction to be processed
  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 200
  });

  let orderHash = getOrderHashFromOrderV1(order);

  return orderHash;
};

export { createOrder };
