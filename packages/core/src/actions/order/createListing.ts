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
  EndDateTooFarError,
  InvalidEndDateError,
  InvalidStartAmountError,
  InvalidStartDateError
} from "../../errors/actions.js";
import { OrderV1, RouteType } from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";

export interface CreateListingParameters {
  account: AccountInterface;
  brokerAddress: string;
  currencyAddress?: string;
  tokenAddress: string;
  tokenId: bigint;
  amount: bigint;
  startDate?: number;
  endDate?: number;
  waitForTransaction?: boolean;
}

export interface CreateListingResult {
  orderHash: bigint;
  transactionHash: string;
}

const docsPath = "/sdk-core/create-listing";
/**
 * Creates a listing on the ArkProject.
 *
 * This function takes a configuration object and listing parameters, builds a complete OrderV1 object
 * with default values for unspecified fields, compiles the order data, signs it, and then executes
 * the transaction to create a listing on the Arkchain using the specified Starknet and Arkchain accounts.
 *
 * @param {Config} config - The core SDK config, including network and contract information.
 * @param {CreateListingParameters} parameters - The parameters for the listing, including Starknet account,
 * Arkchain account, base order details, and an optional owner address.
 *
 * @returns {Promise<string>} A promise that resolves with the hash of the created order.
 *
 */
export async function createListing(
  config: Config,
  parameters: CreateListingParameters
): Promise<CreateListingResult> {
  const {
    account,
    brokerAddress,
    currencyAddress = config.starknetCurrencyContract,
    tokenAddress,
    tokenId,
    amount,
    startDate,
    endDate,
    waitForTransaction = true
  } = parameters;
  const now = Math.floor(Date.now() / 1000);
  const startedAt = startDate || now;
  const endedAt = endDate || now + 60 * 60 * 24;
  const maxEndedAt = now + 60 * 60 * 24 * 30;

  if (startedAt < now) {
    throw new InvalidStartDateError(startDate, { docsPath });
  }

  if (endedAt < startedAt) {
    throw new InvalidEndDateError({ endDate, startDate }, { docsPath });
  }

  if (endedAt > maxEndedAt) {
    throw new EndDateTooFarError({ endDate, maxEndedAt }, { docsPath });
  }

  if (amount === BigInt(0)) {
    throw new InvalidStartAmountError({ docsPath });
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
    startAmount: cairo.uint256(amount),
    endAmount: cairo.uint256(0),
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
