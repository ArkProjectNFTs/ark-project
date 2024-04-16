import {
  Account,
  AccountInterface,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import { FulfillInfo, FulfillOfferInfo } from "../../types/index.js";
import { _fulfillOrder } from "./_fulfill.js";

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
  arkAccount: Account;
  fulfillOfferInfo: FulfillOfferInfo;
  owner?: string;
}

const fulfillOffer = async (
  config: Config,
  parameters: FulfillOfferParameters
) => {
  const { starknetAccount, arkAccount, fulfillOfferInfo, owner } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const fulfillInfo: FulfillInfo = {
    order_hash: fulfillOfferInfo.orderHash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    token_chain_id: chainId,
    token_address: fulfillOfferInfo.tokenAddress,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillOfferInfo.tokenId)
    ),
    fulfill_broker_address: starknetAccount.address
  };

  _fulfillOrder(config, {
    starknetAccount,
    arkAccount,
    fulfillInfo,
    owner
  });
};

export { fulfillOffer };
