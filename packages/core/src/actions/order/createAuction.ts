import {
  type AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  CallData,
  type Uint256
} from "starknet";

import type { Config } from "../../createConfig.js";
import { type OrderV1, RouteType } from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";

export interface CreateAuctionParameters {
  account: AccountInterface;
  brokerAddress: string;
  tokenAddress: string;
  tokenId: bigint;
  currencyAddress?: string;
  startAmount: bigint;
  endAmount?: bigint;
  startDate?: number;
  endDate?: number;
  waitForTransaction?: boolean;
}

export interface CreateAuctionResult {
  orderHash: bigint;
  transactionHash: string;
}

/**
 * Creates an Auction on the ArkProject.
 *
 * This function takes a configuration object and listing parameters, builds a complete OrderV1 object
 * with default values for unspecified fields, compiles the order data, signs it, and then executes
 * the transaction to create a listing on the Arkchain using the specified Starknet and Arkchain accounts.
 *
 * @param {Config} config - The core SDK config, including network and contract information.
 * @param {CreateAuctionParameters} parameters - The parameters for the listing, including Starknet account,
 * Arkchain account, base order details, and an optional owner address.
 *
 * @returns {Promise<string>} A promise that resolves with the hash of the created order.
 *
 */
export async function createAuction(
  config: Config,
  parameters: CreateAuctionParameters
): Promise<CreateAuctionResult> {
  const {
    account,
    brokerAddress,
    tokenAddress,
    tokenId,
    currencyAddress = config.starknetCurrencyContract,
    startAmount,
    endAmount,
    startDate,
    endDate,
    waitForTransaction = true
  } = parameters;
  const now = Math.floor(Date.now() / 1000);
  const startedAt = startDate || now;
  const endedAt = endDate || now + 60 * 60 * 24;
  const maxEndedAt = now + 60 * 60 * 24 * 30;

  if (startedAt < now) {
    throw new Error(
      `Invalid start date. Start date (${startDate}) cannot be in the past.`
    );
  }

  if (endedAt < startedAt) {
    throw new Error(
      `Invalid end date. End date (${endDate}) must be after the start date (${startDate}).`
    );
  }

  if (endedAt > maxEndedAt) {
    throw new Error(
      `End date too far in the future. End date (${endDate}) exceeds the maximum allowed (${maxEndedAt}).`
    );
  }

  if (startAmount === BigInt(0)) {
    throw new Error(
      "Invalid start amount. The start amount must be greater than zero."
    );
  }

  if (endAmount && endAmount < startAmount) {
    throw new Error(
      "Invalid end amount. The end amount must be greater than the start amount."
    );
  }

  const chainId = await config.starknetProvider.getChainId();

  const order: OrderV1 = {
    route: RouteType.Erc721ToErc20,
    currencyAddress,
    currencyChainId: chainId,
    salt: 1,
    offerer: account.address,
    tokenChainId: chainId,
    tokenAddress,
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(tokenId)
    ),
    quantity: cairo.uint256(1),
    startAmount: cairo.uint256(startAmount),
    endAmount: cairo.uint256(endAmount || 0),
    startDate: startedAt,
    endDate: endedAt,
    brokerId: brokerAddress,
    additionalData: []
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
      entrypoint: "create_order",
      calldata: CallData.compile({ order })
    }
  ]);

  if (waitForTransaction) {
    await config.starknetProvider.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000
    });
  }

  const orderHash = getOrderHashFromOrderV1(order);

  return {
    orderHash,
    transactionHash: result.transaction_hash
  };
}
