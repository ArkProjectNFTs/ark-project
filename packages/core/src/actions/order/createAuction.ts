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
  AuctionV1,
  OrderV1,
  RouteType
} from "../../types/index.js";
import { getOrderHashFromOrderV1 } from "../../utils/index.js";

interface CreateAuctionParameters {
  starknetAccount: AccountInterface;
  order: AuctionV1;
  approveInfo: ApproveErc721Info;
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
const createAuction = async (
  config: Config,
  parameters: CreateAuctionParameters
) => {
  const { starknetAccount, order: baseOrder, approveInfo } = parameters;
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000);
  const endDate = baseOrder.endDate || Math.floor(currentDate.getTime() / 1000);
  const chainId = await config.starknetProvider.getChainId();

  if (startDate < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid start date");
  }

  if (endDate < startDate) {
    throw new Error("Invalid end date");
  }

  if (baseOrder.startAmount === BigInt(0)) {
    throw new Error("Invalid start amount");
  }

  if (baseOrder.endAmount < baseOrder.startAmount) {
    throw new Error("Invalid end amount");
  }

  const order: OrderV1 = {
    route: RouteType.Erc721ToErc20,
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
    endAmount: cairo.uint256(baseOrder.endAmount || 0),
    startDate: startDate,
    endDate: endDate,
    brokerId: baseOrder.brokerId,
    additionalData: []
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

export { createAuction };
