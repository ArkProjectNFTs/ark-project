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
  FulfillInfo,
  FulfillOfferInfo
} from "../../types/index.js";

/**
 * Fulfill an offer on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillOfferParameters} parameters - Parameters for fulfilling the offer.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
interface FulfillOfferParameters {
  starknetAccount: AccountInterface;
  fulfillOfferInfo: FulfillOfferInfo;
  approveInfo: ApproveErc721Info;
}

const fulfillOffer = async (
  config: Config,
  parameters: FulfillOfferParameters
) => {
  const { starknetAccount, fulfillOfferInfo, approveInfo } = parameters;
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
        to: config.starknetContracts.executor,
        token_id: cairo.uint256(approveInfo.tokenId)
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
  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { fulfillOffer };
