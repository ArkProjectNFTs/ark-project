import { cairo } from "starknet";
import * as sn from "starknet";

import { Config } from "@ark-project/core";

export const setArkFees = async (
  config: Config,
  deployerAccount: sn.Account,
  starknetAddress: string,
  fees: number
) => {
  const { abi } = await config.starknetProvider.getClassAt(starknetAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new sn.Contract(
    abi,
    config.starknetExecutorContract,
    config.starknetProvider
  );

  executorContract.connect(deployerAccount);
  const response = await executorContract.set_ark_fees({
    numerator: cairo.uint256(fees),
    denominator: cairo.uint256(10000)
  });
  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};
