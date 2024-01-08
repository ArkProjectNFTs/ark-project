import {
  Account,
  AccountInterface,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  RpcProvider,
  shortString,
  Uint256
} from "starknet";

import { FulfillInfo, FulfillListingInfo, Network } from "../../types";
import { _fulfillOrder } from "./_fulfill";

const fulfillListing = async (
  network: Network,
  arkProvider: RpcProvider,
  starknetFulfillerAccount: AccountInterface,
  arkFulfillerAccount: Account,
  fulfillListingInfo: FulfillListingInfo,
  owner?: string
) => {
  let fulfillInfo: FulfillInfo = {
    order_hash: fulfillListingInfo.order_hash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetFulfillerAccount.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: fulfillListingInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillListingInfo.token_id)
    )
  };

  _fulfillOrder(
    network,
    arkProvider,
    starknetFulfillerAccount,
    arkFulfillerAccount,
    fulfillInfo,
    owner
  );
};

export { fulfillListing };
