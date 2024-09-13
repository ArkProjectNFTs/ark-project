import {
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  Uint256
} from "starknet";

import { Config } from "../../createConfig.js";
import { FulfillInfo } from "../../types/index.js";

export interface FulfillAuctionParameters {
  account: AccountInterface;
  brokerAddress: string;
  orderHash: bigint;
  relatedOrderHash: bigint;
  tokenAddress: string;
  tokenId: bigint;
  currencyAddress?: string;
  waitForTransaction?: boolean;
}

export interface FulfillAuctionResult {
  transactionHash: string;
}

/**
 * Fulfill an auction on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillAuctionParameters} parameters - Parameters for fulfilling the listing.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
export async function fulfillAuction(
  config: Config,
  parameters: FulfillAuctionParameters
): Promise<FulfillAuctionResult> {
  const {
    account,
    brokerAddress,
    orderHash,
    relatedOrderHash,
    tokenAddress,
    tokenId,
    waitForTransaction = true
  } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    orderHash,
    relatedOrderHash: new CairoOption<bigint>(
      CairoOptionVariant.Some,
      relatedOrderHash
    ),
    fulfiller: account.address,
    tokenChainId: chainId,
    tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(tokenId)
    ),
    fulfillBrokerAddress: brokerAddress
  };

  const result = await account.execute([
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
