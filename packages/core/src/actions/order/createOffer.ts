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
  OfferV1,
  OrderV1,
  RouteType
} from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";
import { getAllowance } from "../read/getAllowance.js";

interface CreateOfferParameters {
  starknetAccount: AccountInterface;
  offer: OfferV1;
  approveInfo: ApproveErc20Info;
}

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
const createOffer = async (
  config: Config,
  parameters: CreateOfferParameters
) => {
  const { starknetAccount, offer: baseOrder, approveInfo } = parameters;
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate());
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000);
  const currencyAddress =
    baseOrder.currencyAddress || config.starknetCurrencyContract;
  const endDate =
    baseOrder.endDate || Math.floor(currentDate.getTime() / 1000) + 30;

  if (currencyAddress !== approveInfo.currencyAddress) {
    throw new Error("Invalid currency address, offer and approveInfo mismatch");
  }
  const chainId = await config.starknetProvider.getChainId();
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
    tokenId: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(baseOrder.tokenId)
    ),
    quantity: cairo.uint256(1),
    startAmount: cairo.uint256(baseOrder.startAmount),
    endAmount: cairo.uint256(0),
    startDate: startDate,
    endDate: endDate,
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
        order: order
      })
    }
  ]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  const orderHash = getOrderHashFromOrderV1(order);

  return orderHash;
};

export { createOffer };
