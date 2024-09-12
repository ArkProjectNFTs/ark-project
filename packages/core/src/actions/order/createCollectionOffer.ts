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
  CollectionOfferV1,
  OrderV1,
  RouteType
} from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";
import { getAllowance } from "../read/getAllowance.js";

interface CreateCollectionOfferParameters {
  starknetAccount: AccountInterface;
  offer: CollectionOfferV1;
  approveInfo: ApproveErc20Info;
  waitForTransaction?: boolean;
}

export interface CreateCollectionOfferResult {
  orderHash: bigint;
  transactionHash: string;
}

/**
 * Creates a collection offer on the ArkProject.
 *
 * This function takes a configuration object and listing parameters, builds a complete OrderV1 object
 * with default values for unspecified fields, compiles the order data, signs it, and then executes
 * the transaction to create a listing on the Arkchain using the specified Starknet and Arkchain accounts.
 *
 * @param {Config} config - The core SDK config, including network and contract information.
 * @param {CreateCollectionOfferParameters} parameters - The parameters for the listing, including Starknet account,
 * Arkchain account, base order details, and an optional owner address.
 *
 * @returns {Promise<CreateCollectionOfferResult>} A promise that resolves with the hash of the created order.
 *
 */
async function createCollectionOffer(
  config: Config,
  parameters: CreateCollectionOfferParameters
): Promise<CreateCollectionOfferResult> {
  const {
    starknetAccount,
    offer: baseOrder,
    approveInfo,
    waitForTransaction = true
  } = parameters;
  const now = Math.floor(Date.now() / 1000);
  const startDate = baseOrder.startDate || now;
  const endDate = baseOrder.endDate || now + 30;
  const maxEndDate = now + 60 * 60 * 24 * 30;
  const chainId = await config.starknetProvider.getChainId();
  const currencyAddress =
    baseOrder.currencyAddress || config.starknetCurrencyContract;

  if (startDate < Math.floor(Date.now() / 1000)) {
    throw new Error(
      `Invalid start date. Start date (${startDate}) cannot be in the past.`
    );
  }

  if (endDate < startDate) {
    throw new Error(
      `Invalid end date. End date (${endDate}) must be after the start date (${startDate}).`
    );
  }

  if (endDate > maxEndDate) {
    throw new Error(
      `End date too far in the future. End date (${endDate}) exceeds the maximum allowed (${maxEndDate}).`
    );
  }

  if (baseOrder.startAmount === BigInt(0)) {
    throw new Error(
      "Invalid start amount. The start amount must be greater than zero."
    );
  }

  if (currencyAddress !== approveInfo.currencyAddress) {
    throw new Error("Invalid currency address. Offer and approveInfo mismatch");
  }

  const currentAllowance = await getAllowance(
    config,
    approveInfo.currencyAddress,
    starknetAccount.address
  );
  const allowance = currentAllowance + approveInfo.amount;

  const order: OrderV1 = {
    route: RouteType.Erc20ToErc721,
    currencyAddress:
      baseOrder.currencyAddress ?? config.starknetCurrencyContract,
    currencyChainId: chainId,
    salt: 1,
    offerer: starknetAccount.address,
    tokenChainId: chainId,
    tokenAddress: baseOrder.tokenAddress,
    tokenId: new CairoOption<Uint256>(CairoOptionVariant.None),
    quantity: cairo.uint256(1),
    startAmount: cairo.uint256(baseOrder.startAmount),
    endAmount: cairo.uint256(0),
    startDate,
    endDate,
    brokerId: baseOrder.brokerId,
    additionalData: []
  };

  const result = await starknetAccount.execute([
    {
      contractAddress: approveInfo.currencyAddress,
      entrypoint: "approve",
      calldata: CallData.compile({
        spender: config.starknetExecutorContract,
        amount: cairo.uint256(allowance)
      })
    },
    {
      contractAddress: config.starknetExecutorContract,
      entrypoint: "create_order",
      calldata: CallData.compile({
        order
      })
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

export { createCollectionOffer };
