import {
  Account,
  BigNumberish,
  cairo,
  CairoOption,
  CairoOptionVariant,
  RpcProvider,
  shortString,
  Uint256
} from "starknet";

import { FulfillInfo, FulfillListingInfo } from "../types";
import { _fulfillOrder } from "./_fulfillOrder";

const fulfillListing = async (
  provider: RpcProvider,
  account: Account,
  fulfillListingInfo: FulfillListingInfo
) => {
  let fulfillInfo: FulfillInfo = {
    order_hash: fulfillListingInfo.order_hash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: account.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: fulfillListingInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillListingInfo.token_id)
    )
  };

  _fulfillOrder(provider, account, fulfillInfo);
};

export { fulfillListing };
