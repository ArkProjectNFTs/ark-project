import {
  Account,
  AccountInterface,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  Uint256
} from "starknet";

import { Config } from "../../createConfig";
import { FulfillInfo, FulfillListingInfo } from "../../types";
import { _fulfillOrder } from "./_fulfill";

/**
 * Fulfill a listing on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillListingParameters} parameters - Parameters for fulfilling the listing.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
interface FulfillListingParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  fulfillListingInfo: FulfillListingInfo;
  owner?: string;
}

const fulfillListing = async (
  config: Config,
  parameters: FulfillListingParameters
) => {
  const { starknetAccount, arkAccount, fulfillListingInfo, owner } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    order_hash: fulfillListingInfo.orderHash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    token_chain_id: chainId,
    token_address: fulfillListingInfo.tokenAddress,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillListingInfo.tokenId)
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

export { fulfillListing };
