import { Account, cairo, CallData } from "starknet";

import { Config } from "../../createConfig.js";
import { validateFeesRatio } from "../../utils/index.js";

interface Params {
  account: Account;
  tokenAddress: string;
  receiver: string;
  numerator: number;
  denominator: number;
}

export const setCollectionCreatorFees = async (
  config: Config,
  params: Params
) => {
  if (!validateFeesRatio(params.numerator, params.denominator)) {
    throw new Error("Invalid fees ratio");
  }

  const result = await params.account.execute({
    contractAddress: config.starknetExecutorContract,
    entrypoint: "set_collection_creator_fees",
    calldata: CallData.compile({
      nft_address: params.tokenAddress,
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
