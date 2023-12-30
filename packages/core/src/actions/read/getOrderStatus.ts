import { BigNumberish, CallData, Contract, RpcProvider } from "starknet";

import { SOLIS_ORDER_BOOK_ADDRESS } from "../../constants";

const getOrderStatus = async (
  orderHash: BigNumberish,
  provider: RpcProvider
) => {
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

  const orderStatus =
    await orderbookContract.get_order_status(order_hash_calldata);
  return { orderStatus };
};

export { getOrderStatus };
