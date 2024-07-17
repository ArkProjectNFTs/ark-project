import { cairo } from "starknet";
import * as sn from "starknet";

export const setArkFees = async (
  starknetExecutorContract: string,
  provider: sn.Provider,
  deployerAccount: sn.Account,
  fees: number
) => {
  const { abi } = await provider.getClassAt(starknetExecutorContract);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new sn.Contract(
    abi,
    starknetExecutorContract,
    provider
  );

  executorContract.connect(deployerAccount);
  const response = await executorContract.set_ark_fees({
    numerator: cairo.uint256(fees),
    denominator: cairo.uint256(10000)
  });
  await provider.waitForTransaction(response.transaction_hash);
};

export const setDefaultCreatorFees = async (
  starknetExecutorContract: string,
  provider: sn.Provider,
  deployerAccount: sn.Account,
  arkReceiver: string,
  fees: number
) => {
  const { abi } = await provider.getClassAt(starknetExecutorContract);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new sn.Contract(
    abi,
    starknetExecutorContract,
    provider
  );
  executorContract.connect(deployerAccount);
  const response = await executorContract.set_default_creator_fees(
    arkReceiver,
    {
      numerator: cairo.uint256(fees),
      denominator: cairo.uint256(10000)
    }
  );
  await provider.waitForTransaction(response.transaction_hash);
};

export const setBrokerFees = async (
  provider: sn.Provider,
  deployerAccount: sn.Account,
  executorAddress: string
) => {
  const { abi } = await provider.getClassAt(executorAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executorContract = new sn.Contract(abi, executorAddress, provider);
  executorContract.connect(deployerAccount);
  const response = await executorContract.set_broker_fees(
    "0x00cb88c43637d96793e1925d357f543eb2be1b7bfb149bb666e4efa6c645ad35",
    {
      numerator: cairo.uint256(75),
      denominator: cairo.uint256(10000)
    }
  );
  await provider.waitForTransaction(response.transaction_hash);
};
