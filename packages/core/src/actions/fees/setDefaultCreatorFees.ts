import { Account, cairo, CallData } from "starknet";

import { Config } from "../../createConfig.js";
import { InvalidFeesRatioError } from "../../errors/actions.js";
import { validateFeesRatio } from "../../utils/index.js";

interface Params {
  account: Account;
  receiver: string;
  numerator: number;
  denominator: number;
}

export const setDefaultCreatorFees = async (config: Config, params: Params) => {
  if (!validateFeesRatio(params.numerator, params.denominator)) {
    throw new InvalidFeesRatioError();
  }

  const result = await params.account.execute({
    contractAddress: config.starknetExecutorContract,
    entrypoint: "set_default_creator_fees",
    calldata: CallData.compile({
      receiver: params.receiver,
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
