import { CairoCustomEnum, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";
import { NoABIError } from "../../errors/actions.js";

interface GetOrderStatusParameters {
  orderHash: bigint;
}

const getOrderStatus = async (
  config: Config,
  parameters: GetOrderStatusParameters
) => {
  const { orderHash } = parameters;
  const { abi: executorAbi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (executorAbi === undefined) {
    throw new NoABIError({ docsPath: "/sdk-core/get-order-status" });
  }

  const orderbookContract = new Contract(
    executorAbi,
    config.starknetExecutorContract,
    config.starknetProvider
  );

  const order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderStatus: CairoCustomEnum =
    await orderbookContract.get_order_status(order_hash_calldata);

  return { orderStatus: orderStatus.activeVariant().toString() };
};

export { getOrderStatus };
