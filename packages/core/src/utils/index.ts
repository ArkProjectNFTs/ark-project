import * as starknet from "@scure/starknet";
import { CallData } from "starknet";

import { OrderV1 } from "../types";

export const getOrderHashFromOrderV1 = (order: OrderV1) => {
  let compiledOrder = CallData.compile({
    order
  });
  let compiletOrderBigIntArray = compiledOrder.map(BigInt);
  return starknet.poseidonHashMany(compiletOrderBigIntArray);
};
