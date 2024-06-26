import { CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetOrderSignerParameters {
  orderHash: bigint;
}

const getOrderSigner = async (
  config: Config,
  parameters: GetOrderSignerParameters
) => {
  const { orderHash } = parameters;
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainOrderbookContract
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const orderbookContract = new Contract(
    orderbookAbi,
    config.arkchainOrderbookContract,
    config.arkProvider
  );

  const order_hash_calldata = CallData.compile({
    order_hash: orderHash
  });

  const orderSigner =
    await orderbookContract.get_order_signer(order_hash_calldata);
  return { orderSigner };
};

export { getOrderSigner };
