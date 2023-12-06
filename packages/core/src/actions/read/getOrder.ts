import { BigNumberish, CallData, Contract, RpcProvider } from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";

const getOrder = async (orderHash: BigNumberish, provider: RpcProvider) => {
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
    token_hash: orderHash
  });

  const order = await orderbookContract.get_order(order_hash_calldata);
  return { order };
};

export { getOrder };
