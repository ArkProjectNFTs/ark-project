import {
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import { FulfillAuctionInfo, FulfillInfo } from "../../types/index.js";

/**
 * Fulfill an auction on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillAuctionParameters} parameters - Parameters for fulfilling the listing.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
interface FulfillAuctionParameters {
  starknetAccount: AccountInterface;
  fulfillAuctionInfo: FulfillAuctionInfo;
}

const fulfillAuction = async (
  config: Config,
  parameters: FulfillAuctionParameters
) => {
  const { starknetAccount, fulfillAuctionInfo } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    orderHash: fulfillAuctionInfo.orderHash,
    relatedOrderHash: new CairoOption<bigint>(
      CairoOptionVariant.Some,
      fulfillAuctionInfo.relatedOrderHash
    ),
    fulfiller: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: fulfillAuctionInfo.tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillAuctionInfo.tokenId)
    ),
    fulfillBrokerAddress: fulfillAuctionInfo.brokerId
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

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { fulfillAuction };
