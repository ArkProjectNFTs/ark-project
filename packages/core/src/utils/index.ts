import * as starknet from "@scure/starknet";
import { CallData } from "starknet";

import { OrderV1 } from "../types/index.js";

export const getOrderHashFromOrderV1 = (order: OrderV1) => {
  const compiledOrder = CallData.compile({
    order
  });
  const compiletOrderBigIntArray = compiledOrder.map(BigInt);
  return starknet.poseidonHashMany(compiletOrderBigIntArray);
};
