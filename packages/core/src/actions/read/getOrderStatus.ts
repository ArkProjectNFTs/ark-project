import { CairoCustomEnum, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetOrderStatusParameters {
  orderHash: bigint;
}

const getOrderStatus = async (
  config: Config,
  parameters: GetOrderStatusParameters
) => {
  const { orderHash } = parameters;
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainContracts.orderbook
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const orderbookContract = new Contract(
    orderbookAbi,
    config.arkchainContracts.orderbook,
    config.arkProvider
  );

  const order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderStatus: CairoCustomEnum =
    await orderbookContract.get_order_status(order_hash_calldata);

  return { orderStatus: orderStatus.activeVariant().toString() };
};

export { getOrderStatus };
