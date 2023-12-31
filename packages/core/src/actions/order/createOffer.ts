import {
  Account,
  AccountInterface,
  cairo,
  CairoOption,
  CairoOptionVariant,
  RpcProvider,
  shortString,
  Uint256
} from "starknet";

import { SOLIS_ORDER_BOOK_ADDRESS } from "../../constants";
import { OfferV1, OrderV1, RouteType } from "../../types";
import { createOrder } from "./_create";

/**
 * Creates a listing on the Arkchain.
 *
 * This function takes a base order object, builds a complete OrderV1 object
 * with default values for unspecified fields, compiles the order data, signs it,
 * and then executes the transaction to create a listing on the arkchain
 * using the specified account and provider.
 *
 * @param {RpcProvider} provider - The RPC provider instance to interact with the blockchain.
 * @param {Account} account - The burner account used to sign and send the transaction.
 * @param {BaseOrderV1} baseOrder - The base order object containing essential order details.
 *
 * @returns {Promise<void>} A promise that resolves when the transaction is completed.
 *
 * @throws {Error} Throws an error if the ABI for the order book contract is not found.
 */
const createOffer = async (
  arkProvider: RpcProvider,
  starknetAccount: AccountInterface,
  arkAccount: Account,
  baseOrder: OfferV1,
  owner?: string
) => {
  // Retrieve the ABI for the order book contract
  const { abi: orderbookAbi } = await arkProvider.getClassAt(
    SOLIS_ORDER_BOOK_ADDRESS
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  // TODO: this is a hot fix, optional date should be
  // a cairo option and set at contract level to prevent
  // date in the past
  const startDate = baseOrder.startDate || Math.floor(Date.now() / 1000 + 5);
  const endDate = baseOrder.endDate || Math.floor(currentDate.getTime() / 1000);

  // Construct the OrderV1 object from the base order and additional default values
  const order: OrderV1 = {
    route: RouteType.Erc20ToErc721,
    currencyAddress:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    currencyChainId: shortString.encodeShortString("SN_MAIN"),
    salt: 1,
    offerer: starknetAccount.address,
    tokenChainId: shortString.encodeShortString("SN_MAIN"),
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
  const orderHash = await createOrder(
    arkProvider,
    starknetAccount,
    arkAccount,
    order,
    owner
  );
  return orderHash;
};

export { createOffer };
