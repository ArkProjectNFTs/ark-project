import {
  BigNumberish,
  CairoCustomEnum,
  CallData,
  Contract,
  RpcProvider
} from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";

const getOrderType = async (orderHash: BigNumberish, provider: RpcProvider) => {
  const { abi: orderbookAbi } = await provider.getClassAt(ORDER_BOOK_ADDRESS);
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const orderbookContract = new Contract(
    orderbookAbi,
    ORDER_BOOK_ADDRESS,
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
