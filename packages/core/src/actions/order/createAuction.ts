import {
  Account,
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  Uint256
} from "starknet";

import { Config } from "../../createConfig";
import { AuctionV1, OrderV1, RouteType } from "../../types";
import { createOrder } from "./_create";

interface CreateAuctionParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  order: AuctionV1;
  owner?: string;
}

/**
 * Creates an auction on the Arkchain.
 *
 * This function takes a configuration object and auction parameters, builds a complete OrderV1 object
 * with default values for unspecified fields, compiles the order data, signs it, and then executes
 * the transaction to create an auction on the Arkchain using the specified Starknet and Arkchain accounts.
 *
 * @param {Config} config - The core SDK config, including network and contract information.
 * @param {CreateAuctionParameters} parameters - The parameters for the auction, including Starknet account,
 * Arkchain account, base order details, and an optional owner address.
 *
 * @returns {Promise<string>} A promise that resolves with the hash of the created order.
 *
 */
const createAuction = async (
  config: Config,
  parameters: CreateAuctionParameters
) => {
  const { starknetAccount, arkAccount, order: baseOrder, owner } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000 + 60);
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  const endDate = baseOrder.endDate || Math.floor(currentDate.getTime() / 1000);

  if (startDate < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid start date");
  }

  if (endDate < startDate) {
    throw new Error("Invalid end date");
  }

  if (BigInt(baseOrder.startAmount) === BigInt(0)) {
    throw new Error("Invalid start amount");
  }

  if (baseOrder.endAmount < baseOrder.startAmount) {
    throw new Error("Invalid end amount");
  }

  const order: OrderV1 = {
    route: RouteType.Erc721ToErc20,
    currencyAddress: config.starknetContracts.eth,
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

  const orderHash = await createOrder(config, {
    starknetAccount,
    arkAccount,
    order,
    owner
  });

  return orderHash;
};

export { createAuction };
