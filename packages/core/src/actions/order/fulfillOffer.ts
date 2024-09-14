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

export interface FulfillOfferParameters {
  account: AccountInterface;
  brokerAddress: string;
  orderHash: bigint;
  tokenAddress: string;
  tokenId: bigint;
  waitForTransaction?: boolean;
}

export interface FulfillOfferResult {
  transactionHash: string;
}

/**
 * Fulfill an offer on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration.
 * @param {FulfillOfferParameters} parameters - Parameters for fulfilling the offer.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 */
export async function fulfillOffer(
  config: Config,
  parameters: FulfillOfferParameters
): Promise<FulfillOfferResult> {
  const {
    account,
    brokerAddress,
    orderHash,
    tokenAddress,
    tokenId,
    waitForTransaction = true
  } = parameters;
  const chainId = await config.starknetProvider.getChainId();

  const fulfillInfo: FulfillInfo = {
    orderHash,
    relatedOrderHash: new CairoOption<bigint>(CairoOptionVariant.None),
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
      contractAddress: tokenAddress,
      entrypoint: "approve",
      calldata: CallData.compile({
        to: config.starknetExecutorContract,
        token_id: cairo.uint256(tokenId)
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

  console.log(result.transaction_hash);
  return {
    transactionHash: result.transaction_hash
  };
}
