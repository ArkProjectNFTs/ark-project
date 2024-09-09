import { Account, cairo, CallData } from "starknet";

import { Config } from "../../createConfig.js";
import { validateFeesRatio } from "../../utils/index.js";

interface Params {
  brokerAccount: Account;
  numerator: number;
  denominator: number;
}

export const setBrokerFees = async (config: Config, params: Params) => {
  if (!validateFeesRatio(params.numerator, params.denominator)) {
    throw new Error("Invalid fees ratio");
  }

  const result = await params.brokerAccount.execute({
    contractAddress: config.starknetExecutorContract,
    entrypoint: "set_broker_fees",
    calldata: CallData.compile({
      fees_ratio: {
        numerator: cairo.uint256(params.numerator),
        denominator: cairo.uint256(params.denominator)
      }
    })
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);

  return {
    transactionHash: result.transaction_hash
  };
};
