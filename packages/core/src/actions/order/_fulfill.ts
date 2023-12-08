import { Account, CairoCustomEnum, CallData, RpcProvider } from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";
import { signMessage } from "../../signer";
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
  account: Account,
  fulfillInfo: FulfillInfo
) => {
  // Compile the order data
  let compiledOrder = CallData.compile({
    fulfillInfo
  });
  let compiletOrderBigInt = compiledOrder.map(BigInt);

  // Sign the compiled order
  const signInfo = signMessage(compiletOrderBigInt);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });

  // Compile calldata for the create_order function
  let fulfillInfoCalldata = CallData.compile({
    fulfill_info: fulfillInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await account.execute({
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
