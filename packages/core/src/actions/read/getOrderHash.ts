import * as starknet from "@scure/starknet";
import {
  BigNumberish,
  cairo,
  CallData,
  Contract,
  RpcProvider,
  shortString
} from "starknet";

import { SOLIS_ORDER_BOOK_ADDRESS } from "../../constants";

const getOrderHash = async (
  tokenId: BigNumberish,
  tokenAddress: BigNumberish,
  provider: RpcProvider
) => {
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

  const { abi: orderbookAbi } = await provider.getClassAt(
    SOLIS_ORDER_BOOK_ADDRESS
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }
  console.log("--------orderbookAbi", SOLIS_ORDER_BOOK_ADDRESS);
  console.log("--------orderbookAbi", provider);
  const orderbookContract = new Contract(
    orderbookAbi,
    SOLIS_ORDER_BOOK_ADDRESS,
    provider
  );
  console.log("--------orderbookContract", orderbookContract);
  let order_hash_calldata = CallData.compile({
    token_hash: tokenHashMessage
  });

  const orderHash = await orderbookContract.get_order_hash(order_hash_calldata);
  return { orderHash };
};

export { getOrderHash };
