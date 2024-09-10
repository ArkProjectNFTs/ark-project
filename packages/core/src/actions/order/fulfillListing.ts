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
  ApproveErc20Info,
  FulfillInfo,
  FulfillListingInfo
} from "../../types/index.js";
import { getAllowance } from "../read/getAllowance.js";

export interface FulfillListingParameters {
  starknetAccount: AccountInterface;
  fulfillListingInfo: FulfillListingInfo;
  approveInfo: ApproveErc20Info;
  waitForTransaction?: boolean;
}

export type FulfillListingResult = {
  transactionHash: string;
};

/**
 * Fulfill a listing on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillListingParameters} parameters - Parameters for fulfilling the listing.
 *
 * @returns {Promise<FulfillListingResult>} A promise that resolves when the transaction is completed.
 */
export async function fulfillListing(
  config: Config,
  parameters: FulfillListingParameters
): Promise<FulfillListingResult> {
  const {
    starknetAccount,
    fulfillListingInfo,
    approveInfo,
    waitForTransaction = true
  } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const currentAllowance = await getAllowance(
    config,
    approveInfo.currencyAddress,
    starknetAccount.address
  );
  const allowance = currentAllowance + approveInfo.amount;

  const fulfillInfo: FulfillInfo = {
    orderHash: fulfillListingInfo.orderHash,
    relatedOrderHash: new CairoOption<bigint>(CairoOptionVariant.None),
    fulfiller: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: fulfillListingInfo.tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(fulfillListingInfo.tokenId)
    ),
    fulfillBrokerAddress: fulfillListingInfo.brokerId
  };

  const result = await starknetAccount.execute([
    {
      contractAddress: approveInfo.currencyAddress as string,
      entrypoint: "approve",
      calldata: CallData.compile({
        spender: config.starknetExecutorContract,
        amount: cairo.uint256(allowance)
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

  if (waitForTransaction) {
    await config.starknetProvider.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000
    });
  }

  return {
    transactionHash: result.transaction_hash
  };
}
