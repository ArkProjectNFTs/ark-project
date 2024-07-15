import { cairo } from "starknet";
import * as sn from "starknet";

import { Config } from "@ark-project/core";

export const setCollectionCreatorFees = async (
  config: Config,
  adminAccount: sn.Account,
  arkReceiver: string,
  fees: number,
  nftAddress: string
) => {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new sn.Contract(
    abi,
    config.starknetExecutorContract,
    config.starknetProvider
  );
  executorContract.connect(adminAccount);
  const response = await executorContract.set_collection_creator_fees(
    nftAddress,
    arkReceiver,
    {
      numerator: cairo.uint256(fees),
      denominator: cairo.uint256(100)
    }
  );
  await config.starknetProvider.waitForTransaction(response.transaction_hash);
};
