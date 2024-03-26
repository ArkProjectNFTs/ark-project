import { cairo } from "starknet";
import * as sn from "starknet";

import { Config } from "../../src/createConfig";

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
    starknetAddress,
    config.starknetProvider
  );
  executorContract.connect(deployerAccount);
  const response = await executorContract.set_ark_fees(cairo.uint256(fees));
  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};
