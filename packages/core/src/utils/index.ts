import * as starknet from "@scure/starknet";
import { CallData } from "starknet";

import type { OrderV1 } from "../types/index.js";

export const getOrderHashFromOrderV1 = (order: OrderV1) => {
  const compiledOrder = CallData.compile({ order });
  const compiletOrderBigIntArray = compiledOrder.map(BigInt);

  return starknet.poseidonHashMany(compiletOrderBigIntArray);
};

export function validateFeesRatio(numerator: number, denominator: number) {
  return numerator >= 0 && denominator > 0 && numerator < denominator;
}
