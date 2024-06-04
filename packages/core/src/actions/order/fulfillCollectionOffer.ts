import {
  AccountInterface,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import {
  ApproveErc721Info,
  FulfillCollectionOfferInfo,
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
interface FulfillCollectionOfferParameters {
  starknetAccount: AccountInterface;
  fulfillOfferInfo: FulfillCollectionOfferInfo;
  // approveInfo: ApproveErc721Info;
}

const fulfillCollectionOffer = async (
  config: Config,
  parameters: FulfillCollectionOfferParameters
) => {
  const { starknetAccount, fulfillOfferInfo } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const fulfillInfo: FulfillInfo = {
    order_hash: fulfillOfferInfo.orderHash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    token_chain_id: chainId,
    token_address: fulfillOfferInfo.tokenAddress,
    token_id: new CairoOption<Uint256>(CairoOptionVariant.None),
    fulfill_broker_address: fulfillOfferInfo.brokerId
  };

  const result = await starknetAccount.execute([
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

export { fulfillCollectionOffer };
