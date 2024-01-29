import {
  Account,
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  Uint256
} from "starknet";

import { Config } from "../../createConfig";
import { OfferV1, OrderV1, RouteType } from "../../types";
import { createOrder } from "./_create";

interface CreateOfferParameters {
  starknetAccount: AccountInterface;
  arkAccount: Account;
  offer: OfferV1;
  owner?: string;
}

/**
 * Creates an offer on the Arkchain.
 *
 * Similar to createListing, this function prepares and executes a transaction to create an offer.
 * It handles the compilation and signing of the order data and executes the transaction on the Arkchain.
 *
 * @param {Config} config - The core SDK configuration, containing network and contract details.
 * @param {CreateOfferParameters} parameters - The parameters for the offer, including accounts,
 * base order information, and an optional owner address.
 *
 * @returns {Promise<string>} A promise that resolves with the hash of the created offer.
 *
 */
const createOffer = async (
  config: Config,
  parameters: CreateOfferParameters
) => {
  const { starknetAccount, arkAccount, offer: baseOrder, owner } = parameters;

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  // TODO: this is a hot fix, optional date should be
  // a cairo option and set at contract level to prevent
  // date in the past
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000 + 5);
  const endDate = baseOrder.endDate || Math.floor(currentDate.getTime() / 1000);
  const chainId = await config.starknetProvider.getChainId();
  // Construct the OrderV1 object from the base order and additional default values
  const order: OrderV1 = {
    route: RouteType.Erc20ToErc721,
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
    additionalData: [45]
  };

  const orderHash = await createOrder(config, {
    starknetAccount,
    arkAccount,
    order,
    owner
  });
  return orderHash;
};

export { createOffer };
