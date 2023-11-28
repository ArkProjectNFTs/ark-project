import { num, BigNumberish } from "starknet";
import { OrderV1, ExecutionInfo } from "./types";
import * as starknet from "@scure/starknet";

// Helper function to convert BigNumberish to Uint8Array
export function bigNumberishToUint8Array(value: BigNumberish): Uint8Array {
  const hex = num.toHex(value).replace("0x", "").padStart(64, "0");
  return num.hexToBytes(`0x${hex}`);
}

export function poseidonHashOrder(order: OrderV1): string {
  const elements: bigint[] = [
    BigInt(order.route),
    BigInt(order.currencyAddress),
    BigInt(order.currencyChainId),
    BigInt(order.salt),
    BigInt(order.offerer),
    BigInt(order.tokenChainId),
    BigInt(order.tokenAddress),
    ...(order.tokenId
      ? [BigInt(0), BigInt(order.tokenId.low), BigInt(order.tokenId.high)]
      : [BigInt(1)]),
    BigInt(order.quantity.low),
    BigInt(order.quantity.high),
    BigInt(order.startAmount.low),
    BigInt(order.startAmount.high),
    BigInt(order.endAmount.low),
    BigInt(order.endAmount.high),
    BigInt(order.startDate),
    BigInt(order.endDate),
    BigInt(order.brokerId),
    BigInt(order.additionalData.length),
  ];

  const generatedHash = starknet.poseidonHashMany(elements);
  return num.toHex(generatedHash);
}

/**
 * Constructs a Keccak hash from the order's properties.
 * Property order is important as it determines the hash output.
 * @param {OrderV1} order - The order to hash.
 * @returns {string} The Keccak hash of the order as a hex string.
 */
export function keccakHashOrder(order: OrderV1): string {
  // Convert order properties to Uint8Array and concatenate them.
  // The array is initialized with a fixed set of properties.
  let results = Uint8Array.from([
    ...bigNumberishToUint8Array(order.route),
    ...bigNumberishToUint8Array(order.currencyAddress),
    ...bigNumberishToUint8Array(order.currencyChainId),
    ...bigNumberishToUint8Array(order.salt),
    ...bigNumberishToUint8Array(order.offerer),
    ...bigNumberishToUint8Array(order.tokenChainId),
    ...bigNumberishToUint8Array(order.tokenAddress),
    ...(order.tokenId
      ? [
          ...bigNumberishToUint8Array(0),
          ...bigNumberishToUint8Array(order.tokenId.low),
          ...bigNumberishToUint8Array(order.tokenId.high),
        ]
      : [...bigNumberishToUint8Array(1)]),
    ...bigNumberishToUint8Array(order.quantity.low),
    ...bigNumberishToUint8Array(order.quantity.high),
    ...bigNumberishToUint8Array(order.startAmount.low),
    ...bigNumberishToUint8Array(order.startAmount.high),
    ...bigNumberishToUint8Array(order.endAmount.low),
    ...bigNumberishToUint8Array(order.endAmount.high),
    ...bigNumberishToUint8Array(order.startDate),
    ...bigNumberishToUint8Array(order.endDate),
    ...bigNumberishToUint8Array(order.brokerId),
    ...bigNumberishToUint8Array(order.additionalData.length),
  ]);

  // Concatenate additionalData items to the results array.
  order.additionalData.forEach((item) => {
    const additionalDataArray = bigNumberishToUint8Array(item);
    results = new Uint8Array([...results, ...additionalDataArray]);
  });

  // Generate the hash from the concatenated Uint8Arrays.
  const generatedHash = starknet.keccak(results);

  // Convert the generated hash to a hexadecimal string.
  return num.toHex(generatedHash);
}

/**
 * Constructs a Keccak hash from the order's properties.
 * Property order is important as it determines the hash output.
 * @param {OrderV1} order - The order to hash.
 * @returns {string} The Keccak hash of the order as a hex string.
 */
// export function hashExecutionInfo(execution: ExecutionInfo): string {
//   // Convert order properties to Uint8Array and concatenate them.
//   // The array is initialized with a fixed set of properties.
//   let results = Uint8Array.from([
//     ...bigNumberishToUint8Array(execution.orderHash),
//     ...bigNumberishToUint8Array(execution.fulfiller),
//     ...bigNumberishToUint8Array(execution.offerHash || 1),
//     ...bigNumberishToUint8Array(execution.tokenChainId),
//     ...bigNumberishToUint8Array(execution.tokenAddress),
//     ...(execution.tokenId
//       ? [
//           ...bigNumberishToUint8Array(0),
//           ...bigNumberishToUint8Array(execution.tokenId.low),
//           ...bigNumberishToUint8Array(execution.tokenId.high),
//         ]
//       : [...bigNumberishToUint8Array(1)]),
//   ]);

//   // Generate the hash from the concatenated Uint8Arrays.
//   const generatedHash = starknet.keccak(results);

//   // Convert the generated hash to a hexadecimal string.
//   return num.toHex(generatedHash);
// }
