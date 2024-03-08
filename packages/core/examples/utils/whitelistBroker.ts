import { Account, BigNumberish, CallData } from "starknet";

import { Config } from "../../src/createConfig";

export const whitelistBroker = async (
  config: Config,
  adminAccount: Account,
  brokerId: BigNumberish
) => {
  const { abi: orderbookAbi } = await config.arkProvider.getClassAt(
    config.arkchainContracts.orderbook
  );

  if (orderbookAbi === undefined) {
    throw new Error("no abi.");
  }

  const whitelist_hash_calldata = CallData.compile({
    broker_id: brokerId
  });

  const result = await adminAccount.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "whitelist_broker",
    calldata: whitelist_hash_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 200
  });

  return result;
};
