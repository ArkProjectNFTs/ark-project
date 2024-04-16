import { BigNumberish, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetOrderSignerParameters {
  orderHash: BigNumberish;
}

const getOrderSigner = async (
  config: Config,
  parameters: GetOrderSignerParameters
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

  const orderSigner =
    await orderbookContract.get_order_signer(order_hash_calldata);
  return { orderSigner };
};

export { getOrderSigner };
