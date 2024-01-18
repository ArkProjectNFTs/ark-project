import {
  Account,
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  Uint256
} from "starknet";

import { Config } from "../../createConfig";
import { ListingV1, OrderV1, RouteType } from "../../types";
import { createOrder } from "./_create";

interface CreateListingParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  order: ListingV1;
  owner?: string;
}

/**
 * Creates a listing on the Arkchain.
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
const createListing = async (
  config: Config,
  parameters: CreateListingParameters
) => {
  const { starknetAccount, arkAccount, order: baseOrder, owner } = parameters;

  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000 + 60);
  const endDate = baseOrder.endDate || Math.floor(currentDate.getTime() / 1000);
  const chainId = await config.starknetProvider.getChainId();
  console.log("chainId", chainId);
  // TODO: Change the network id based on the network config
  // instead of using the hardcoded value
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
    endAmount: cairo.uint256(0),
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

export { createListing };
