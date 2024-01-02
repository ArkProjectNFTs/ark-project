import { BigNumberish, CallData, Contract, RpcProvider } from "starknet";

import { getContractAddresses, Network } from "../../constants";

const getOrderSigner = async (
  network: Network,
  orderHash: BigNumberish,
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

  const orderSigner =
    await orderbookContract.get_order_signer(order_hash_calldata);
  return { orderSigner };
};

export { getOrderSigner };
