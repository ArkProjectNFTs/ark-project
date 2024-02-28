import * as starknet from "@scure/starknet";
import { Account, BigNumberish, CallData, Contract } from "starknet";

import { Config } from "../createConfig";
import { OrderV1 } from "../types";
import * as sn from "starknet";

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
