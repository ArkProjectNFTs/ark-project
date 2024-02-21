import {
  DeclareTransactionReceiptResponse,
  DeployTransactionReceiptResponse,
  GetTransactionReceiptResponse,
  InvokeTransactionReceiptResponse
} from "starknet";

import { Config } from "../../createConfig";

interface parameters {
  transactionHash: string;
}

// Type guard to check if the response is of a type that includes block_number
function hasBlockNumber(
  response: GetTransactionReceiptResponse
): response is
  | InvokeTransactionReceiptResponse
  | DeployTransactionReceiptResponse
  | DeclareTransactionReceiptResponse {
  return "block_number" in response;
}

export const waitForTransactionBlock = async (
  config: Config,
  { transactionHash }: parameters
): Promise<boolean> => {
  const response =
    await config.starknetProvider.getTransactionReceipt(transactionHash);
  // Use the type guard to check for block_number
  if (hasBlockNumber(response)) {
    console.log("Block number found:", response.block_number);
    return true;
  } else {
    console.log("Waiting for transaction block to be mined...");
    // Wait for 10 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return waitForTransactionBlock(config, { transactionHash });
  }
};
