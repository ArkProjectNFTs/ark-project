import { CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";
import { NoABIError } from "../../errors/actions.js";

interface GetOrderParameters {
  orderHash: bigint;
}

const getOrder = async (config: Config, parameters: GetOrderParameters) => {
  const { orderHash } = parameters;
  const { abi: orderbookAbi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (orderbookAbi === undefined) {
    throw new NoABIError({ docsPath: "/sdk-core/get-order" });
  }

  const orderbookContract = new Contract(
    orderbookAbi,
    config.starknetExecutorContract,
    config.starknetProvider
  );

  const order_hash_calldata = CallData.compile({
    token_hash: orderHash
  });

  const order = await orderbookContract.get_order(order_hash_calldata);
  return { order };
};

export { getOrder };
