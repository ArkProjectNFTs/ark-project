import { type Account, cairo, CallData } from "starknet";

import type { Config } from "../../createConfig.js";

interface Params {
  brokenAccount: Account;
  numerator: number;
  denominator: number;
}

export const createBroker = async (config: Config, params: Params) => {
  const whitelist_broker_calldata = CallData.compile({
    fees_ratio: {
      numerator: cairo.uint256(params.numerator),
      denominator: cairo.uint256(params.denominator)
    }
  });

  const result = await params.brokenAccount.execute({
    contractAddress: config.starknetExecutorContract,
    entrypoint: "set_broker_fees",
    calldata: whitelist_broker_calldata
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);

  return {
    transactionHash: result.transaction_hash
  };
};
