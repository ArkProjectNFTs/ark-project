import {
  Account,
  AccountInterface,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  shortString,
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

  let fulfillInfo: FulfillInfo = {
    order_hash: fulfillListingInfo.order_hash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: fulfillListingInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillListingInfo.token_id)
    )
  };

  _fulfillOrder(config, {
    starknetAccount,
    arkAccount,
    fulfillInfo,
    owner
  });
};

export { fulfillListing };
