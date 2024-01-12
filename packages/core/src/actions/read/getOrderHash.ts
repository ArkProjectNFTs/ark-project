import * as starknet from "@scure/starknet";
import { BigNumberish, cairo, CallData, Contract, shortString } from "starknet";

import { Config } from "../../createConfig";

interface GetOrderHashParameters {
  tokenId: BigNumberish;
  tokenAddress: string;
}

const getOrderHash = async (
  config: Config,
  parameters: GetOrderHashParameters
) => {
  const { tokenId, tokenAddress } = parameters;
  let tokenHash = {
    tokenId: cairo.uint256(tokenId),
    tokenAddress: tokenAddress,
    tokenChainId: shortString.encodeShortString("SN_MAIN")
  };

  // Compile the order data
  let tokenHashCompiled = CallData.compile({
    tokenHash
  });

  let tokenHashBigIntArray = tokenHashCompiled.map(BigInt);

  const tokenHashMessage = starknet.poseidonHashMany(tokenHashBigIntArray);

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

  let order_hash_calldata = CallData.compile({
    token_hash: tokenHashMessage
  });

  const orderHash = await orderbookContract.get_order_hash(order_hash_calldata);
  return { orderHash };
};

export { getOrderHash };
