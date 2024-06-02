import { Account, CallData } from "starknet";

import { Config } from "../../createConfig.js";

interface Params {
  brokerID: string;
}

export const createBroker = async (config: Config, params: Params) => {
  const address = process.env.SOLIS_ADMIN_ADDRESS as string;
  const privateKey = process.env.SOLIS_ADMIN_PRIVATE_KEY as string;
  const account = new Account(config.arkProvider, address, privateKey, "1");

  const whitelist_broker_calldata = CallData.compile({
    broker_id: params.brokerID
  });

  const result = await account.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "whitelist_broker",
    calldata: whitelist_broker_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash);

  return {
    brokerID: params.brokerID,
    transactionHash: result.transaction_hash
  };
};
