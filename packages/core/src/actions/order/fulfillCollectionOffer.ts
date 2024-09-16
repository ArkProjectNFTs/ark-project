import {
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import {
  ApproveErc721Info,
  BaseFulfillInfo,
  FulfillInfo
} from "../../types/index.js";

interface FulfillCollectionOfferParameters {
  starknetAccount: AccountInterface;
  fulfillOfferInfo: BaseFulfillInfo;
  approveInfo: ApproveErc721Info;
  waitForTransaction?: boolean;
}

interface FulfillCollectionOfferResult {
  transactionHash: string;
}

/**
 * Fulfill a collection offer on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillOfferParameters} parameters - Parameters for fulfilling the offer.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
async function fulfillCollectionOffer(
  config: Config,
  parameters: FulfillCollectionOfferParameters
): Promise<FulfillCollectionOfferResult> {
  const {
    starknetAccount,
    fulfillOfferInfo,
    approveInfo,
    waitForTransaction = true
  } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    orderHash: fulfillOfferInfo.orderHash,
    relatedOrderHash: new CairoOption<bigint>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: fulfillOfferInfo.tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillOfferInfo.tokenId)
    ),
    fulfillBrokerAddress: fulfillOfferInfo.brokerId
  };

  const result = await starknetAccount.execute([
    {
      contractAddress: approveInfo.tokenAddress as string,
      entrypoint: "approve",
      calldata: CallData.compile({
        to: config.starknetExecutorContract,
        token_id: cairo.uint256(approveInfo.tokenId)
      })
    },
    {
      contractAddress: config.starknetExecutorContract,
      entrypoint: "fulfill_order",
      calldata: CallData.compile({
        fulfill_info: fulfillInfo
      })
    }
  ]);

  if (!waitForTransaction) {
    await config.starknetProvider.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000
    });
  }

  return {
    transactionHash: result.transaction_hash
  };
}

export { fulfillCollectionOffer };
