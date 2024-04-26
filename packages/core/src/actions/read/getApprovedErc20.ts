import { AccountInterface, BigNumberish, Contract } from "starknet";

import { Config } from "../../createConfig";

export const getApprovedErc20 = async (
  starknetAccount: AccountInterface,
  currency_address: BigNumberish,
  config: Config
) => {
  if (!currency_address) {
    throw new Error("no currency address.");
  }
  const compressedContract = await config?.starknetProvider.getClassAt(
    currency_address.toString()
  );
  if (compressedContract?.abi === undefined) {
    throw new Error("no abi.");
  }

  const tokenContract = new Contract(
    compressedContract?.abi,
    currency_address.toString(),
    config?.starknetProvider
  );

  const allowance = await tokenContract.allowance(
    starknetAccount.address,
    config?.starknetContracts.executor
  );

  return allowance;
};
