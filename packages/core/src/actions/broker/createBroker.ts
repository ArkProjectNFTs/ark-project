import { Account, CallData } from "starknet";

import { Config } from "../../createConfig";

import "dotenv/config";

export const createBroker = async (config: Config) => {
  const address = process.env.SOLIS_ADMIN_ADDRESS as string;
  const privateKey = process.env.SOLIS_ADMIN_PRIVATE_KEY as string;
  const account = new Account(config.arkProvider, address, privateKey, "1");

  const whitelist_broker_calldata = CallData.compile({
    broker_id: 123
  });

  const result = await account.execute({
    contractAddress: config.arkchainContracts.orderbook,
    entrypoint: "whitelist_broker",
    calldata: whitelist_broker_calldata
  });

  await config.arkProvider.waitForTransaction(result.transaction_hash);

  console.log("Broker created");
  console.log("Transaction hash: " + result.transaction_hash);
  return {
    transactionHash: result.transaction_hash
  };
};
