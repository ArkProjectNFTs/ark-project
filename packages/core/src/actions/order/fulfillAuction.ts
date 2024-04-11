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
import { FulfillAuctionInfo, FulfillInfo } from "../../types";
import { _fulfillOrder } from "./_fulfill";

/**
 * Fulfill an auction on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillListingParameters} parameters - Parameters for fulfilling the auction.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
interface FulfillAuctionParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  fulfillAuctionInfo: FulfillAuctionInfo;
  owner?: string;
}

const fulfillAuction = async (
  config: Config,
  parameters: FulfillAuctionParameters
) => {
  const { starknetAccount, arkAccount, fulfillAuctionInfo, owner } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    order_hash: fulfillAuctionInfo.orderHash,
    related_order_hash: new CairoOption<BigNumberish>(
      CairoOptionVariant.Some,
      fulfillAuctionInfo.relatedOrderHash
    ),
    fulfiller: starknetAccount.address,
    token_chain_id: chainId,
    token_address: fulfillAuctionInfo.tokenAddress,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillAuctionInfo.tokenId)
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

export { fulfillAuction };
