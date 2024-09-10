import { CairoCustomEnum, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetOrderTypeParameters {
  orderHash: bigint;
}

const getOrderType = async (
  config: Config,
  parameters: GetOrderTypeParameters
) => {
  const { orderHash } = parameters;
  const { abi: executorAbi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (executorAbi === undefined) {
    throw new Error("no abi.");
  }

  const orderbookContract = new Contract(
    executorAbi,
    config.starknetExecutorContract,
    config.starknetProvider
  );

  const order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderType: CairoCustomEnum =
    await orderbookContract.get_order_type(order_hash_calldata);
  return { orderType };
};

export { getOrderType };
