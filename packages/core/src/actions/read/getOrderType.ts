import {
  BigNumberish,
  CairoCustomEnum,
  CallData,
  Contract,
  RpcProvider
} from "starknet";

import { getContractAddresses } from "../../constants";
import { Network } from "../../types";

const getOrderType = async (
  orderHash: BigNumberish,
  network: Network,
  provider: RpcProvider
) => {
  const { SOLIS_ORDER_BOOK_ADDRESS } = getContractAddresses(network);

  const { abi: orderbookAbi } = await provider.getClassAt(
    SOLIS_ORDER_BOOK_ADDRESS
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const orderbookContract = new Contract(
    orderbookAbi,
    SOLIS_ORDER_BOOK_ADDRESS,
    provider
  );

  let order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderType: CairoCustomEnum =
    await orderbookContract.get_order_type(order_hash_calldata);
  return { orderType };
};

export { getOrderType };
