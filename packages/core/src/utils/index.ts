import * as starknet from "@scure/starknet";
import { CallData } from "starknet";

import { Config } from "../createConfig.js";
import { OrderV1 } from "../types/index.js";

export const getOrderHashFromOrderV1 = (order: OrderV1) => {
  const compiledOrder = CallData.compile({
    order
  });
  const compiletOrderBigIntArray = compiledOrder.map(BigInt);
  return starknet.poseidonHashMany(compiletOrderBigIntArray);
};

export const getOrderbookAbi = async (config: Config) => {
  // Retrieve the ABI for the order book contract
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainContracts.orderbook
  );
  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  } else {
    return orderbookAbi;
  }
};
