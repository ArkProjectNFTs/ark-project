import {
  type AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  type Uint256
} from "starknet";

import type { Config } from "../../createConfig.js";
import type { FulfillInfo } from "../../types/index.js";
import { getAllowance } from "../read/getAllowance.js";

export interface FulfillListingParameters {
  account: AccountInterface;
  brokerAddress: string;
  currencyAddress?: string;
  orderHash: bigint;
  tokenAddress: string;
  tokenId: bigint;
  amount: bigint;
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
    account,
    brokerAddress,
    currencyAddress = config.starknetCurrencyContract,
    orderHash,
    tokenAddress,
    tokenId,
    amount,
    waitForTransaction = true
  } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const currentAllowance = await getAllowance(
    config,
    currencyAddress,
    account.address
  );
  const allowance = currentAllowance + amount;

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
      contractAddress: currencyAddress,
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
