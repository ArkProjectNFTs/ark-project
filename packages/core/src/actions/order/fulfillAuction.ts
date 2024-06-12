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
  FulfillAuctionInfo,
  FulfillInfo
} from "../../types/index.js";

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
  approveInfo: ApproveErc721Info;
}

const fulfillAuction = async (
  config: Config,
  parameters: FulfillAuctionParameters
) => {
  const { starknetAccount, fulfillAuctionInfo, approveInfo } = parameters;
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
      contractAddress: approveInfo.tokenAddress as string,
      entrypoint: "approve",
      calldata: CallData.compile({
        to: config.starknetExecutorContract,
        token_id: cairo.uint256(approveInfo.tokenId)
      })
    },
    {
      contractAddress: config.starknetExecutorContract,
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
