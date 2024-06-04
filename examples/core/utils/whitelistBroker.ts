import { Account, CallData } from "starknet";

import { Config } from "@ark-project/core";

export const whitelistBroker = async (
  config: Config,
  adminAccount: Account,
  brokerId: string
) => {
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainOrderbookContract
  );

  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const whitelist_hash_calldata = CallData.compile({
    broker_id: brokerId
  });

  const result = await adminAccount.execute({
    contractAddress: config.arkchainOrderbookContract,
    entrypoint: "whitelist_broker",
    calldata: whitelist_hash_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return result;
};
