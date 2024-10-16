import { CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";
import { NoABIError } from "../../errors/actions.js";

interface GetOrderSignerParameters {
  orderHash: bigint;
}

const getOrderSigner = async (
  config: Config,
  parameters: GetOrderSignerParameters
) => {
  const { orderHash } = parameters;
  const { abi: executorAbi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (executorAbi === undefined) {
    throw new NoABIError({ docsPath: "/sdk-core/get-order-signer" });
  }

  const orderbookContract = new Contract(
    executorAbi,
    config.starknetExecutorContract,
    config.starknetProvider
  );

  const order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderSigner =
    await orderbookContract.get_order_signer(order_hash_calldata);
  return { orderSigner };
};

export { getOrderSigner };
