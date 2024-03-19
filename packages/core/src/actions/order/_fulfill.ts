import { AccountInterface, BigNumberish, cairo, CallData } from "starknet";

import { Config } from "../../createConfig";
import { ApproveInfo, FulfillInfo } from "../../types";

interface fulfillOrderParameters {
  starknetAccount: AccountInterface;
  fulfillInfo: FulfillInfo;
  approveInfo: ApproveInfo;
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
  const { starknetAccount, fulfillInfo, approveInfo } = parameters;

  // Execute the transaction
  const result = await starknetAccount.execute([
    {
      contractAddress: approveInfo.currencyAddress as string,
      entrypoint: "approve",
      calldata: CallData.compile({
        spender: config.starknetContracts.executor,
        amount: cairo.uint256(approveInfo.amount)
      })
    },
    {
      contractAddress: config.starknetContracts.executor,
      entrypoint: "fulfill_order",
      calldata: CallData.compile({
        fulfill_info: fulfillInfo
      })
    }
  ]);

  // Wait for the transaction to be processed
  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};
