import { AccountInterface, Contract } from "starknet";

import { Config } from "../../src/createConfig";

export const getBalance = async (
  config: Config,
  currencyAddress: string,
  userAddress: AccountInterface
) => {
  const { abi } = await config.starknetProvider.getClassAt(currencyAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const currencyContract = new Contract(
    abi,
    currencyAddress,
    config.starknetProvider
  );

  const balance: bigint = await currencyContract.balanceOf(userAddress.address);

  return balance;
};
