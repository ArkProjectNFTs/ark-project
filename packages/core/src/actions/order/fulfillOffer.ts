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

import { FulfillInfo, FulfillOfferInfo } from "../../types";
import { _fulfillOrder } from "./_fulfill";

const fulfillOffer = async (
  provider: RpcProvider,
  starknetFulfillerAccount: AccountInterface,
  arkFulfillerAccount: Account,
  fulfillOfferInfo: FulfillOfferInfo,
  owner?: string
) => {
  let fulfillInfo: FulfillInfo = {
    order_hash: fulfillOfferInfo.order_hash,
    related_order_hash: new CairoOption<BigNumberish>(CairoOptionVariant.None),
    fulfiller: starknetFulfillerAccount.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: fulfillOfferInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillOfferInfo.token_id)
    )
  };

  _fulfillOrder(
    provider,
    starknetFulfillerAccount,
    arkFulfillerAccount,
    fulfillInfo,
    owner
  );
};

export { fulfillOffer };
