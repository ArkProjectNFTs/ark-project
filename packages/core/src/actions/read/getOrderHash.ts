import * as starknet from "@scure/starknet";
import { cairo, CallData, Contract, shortString } from "starknet";

import { Config } from "../../createConfig.js";

interface GetOrderHashParameters {
  tokenId: bigint;
  tokenAddress: string;
}

const getOrderHash = async (
  config: Config,
  parameters: GetOrderHashParameters
) => {
  const { tokenId, tokenAddress } = parameters;
  const chainId = await config.starknetProvider.getChainId();
  const tokenHash = {
    tokenId: cairo.uint256(tokenId),
    tokenAddress: tokenAddress,
    tokenChainId: shortString.decodeShortString(chainId.toString())
  };

  // Compile the order data
  const tokenHashCompiled = CallData.compile({
    tokenHash
  });

  const tokenHashBigIntArray = tokenHashCompiled.map(BigInt);

  const tokenHashMessage = starknet.poseidonHashMany(tokenHashBigIntArray);

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
    token_hash: tokenHashMessage
  });

  const orderHash = await orderbookContract.get_order_hash(order_hash_calldata);
  return { orderHash };
};

export { getOrderHash };
