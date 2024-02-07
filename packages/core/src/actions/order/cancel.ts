import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  cairo,
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  CallData,
  shortString,
  Uint256
} from "starknet";

import { Config } from "../../createConfig";
import { getSignInfos } from "../../signer";
import { CancelInfo, FullCancelInfo } from "../../types";

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
interface cancelOrderParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  cancelInfo: CancelInfo;
  owner?: string;
}

const cancelOrder = async (
  config: Config,
  parameters: cancelOrderParameters
) => {
  const { starknetAccount, arkAccount, cancelInfo, owner } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const fullCancelInfo: FullCancelInfo = {
    orderHash: cancelInfo.orderHash,
    canceller: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: cancelInfo.tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(cancelInfo.tokenId)
    )
  };
  const compiledOrder = CallData.compile({
    fullCancelInfo
  });
  const compiledCancelInfo = compiledOrder.map(BigInt);
  const TypedOrderData = {
    message: {
      hash: starknet.poseidonHashMany(compiledCancelInfo).toString()
    },
    domain: {
      name: "Ark",
      chainId: shortString.decodeShortString(
        fullCancelInfo.tokenChainId.toString()
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

  // Compile calldata for the cancel_order function
  const cancel_order_calldata = CallData.compile({
    order: fullCancelInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await arkAccount.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "cancel_order",
    calldata: cancel_order_calldata
  });

  // Wait for the transaction to be processed
  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { cancelOrder };
