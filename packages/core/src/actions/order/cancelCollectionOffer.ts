import {
  AccountInterface,
  CairoOption,
  CairoOptionVariant,
  CallData,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import {
  CancelCollectionOfferInfo,
  FullCancelInfo
} from "../../types/index.js";

interface CancelOrderResult {
  transactionHash: string;
}

interface cancelOrderParameters {
  starknetAccount: AccountInterface;
  cancelInfo: CancelCollectionOfferInfo;
  waitForTransaction?: boolean;
}

/**
 * Executes a transaction to cancel an order on the Arkchain.
 *
 * This function manages the cancellation of an order by compiling the cancellation details,
 * signing the data using the Starknet account, and executing the transaction through the
 * Arkchain account. It handles the complexities involved in the cancellation process,
 * including data compilation, signing, and transaction execution.
 *
 * @param {Config} config - The core SDK configuration, including network and contract details.
 * @param {cancelOrderParameters} parameters - The parameters required to cancel an order, including:
 *   - starknetAccount: The Starknet account used for signing the transaction.
 *   - arkAccount: The Arkchain account used to execute the cancellation transaction.
 *   - cancelInfo: Information about the order to be cancelled, including the order hash and token details.
 *   - owner: (Optional) The owner address for signing purposes.
 *
 * @returns {Promise<void>} A promise that resolves when the cancellation transaction is successfully processed.
 *
 * @throws {Error} Throws an error if the contract ABI is not found or if the transaction fails.
 */
async function cancelCollectionOffer(
  config: Config,
  parameters: cancelOrderParameters
): Promise<CancelOrderResult> {
  const { starknetAccount, cancelInfo, waitForTransaction = true } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fullCancelInfo: FullCancelInfo = {
    orderHash: cancelInfo.orderHash,
    canceller: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: cancelInfo.tokenAddress,
    tokenId: new CairoOption<Uint256>(CairoOptionVariant.None)
  };

  const result = await starknetAccount.execute({
    contractAddress: config.starknetExecutorContract,
    entrypoint: "cancel_order",
    calldata: CallData.compile({
      order: fullCancelInfo
    })
  });

  if (waitForTransaction) {
    await config.starknetProvider.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000
    });
  }

  return {
    transactionHash: result.transaction_hash
  };
}

export { cancelCollectionOffer };
