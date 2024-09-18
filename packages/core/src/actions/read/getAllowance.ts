import { Contract } from "starknet";

import type { Config } from "../../createConfig.js";

export const getAllowance = async (
  config: Config,
  ERC20ContractAddress: string,
  owner: string
) => {
  const { abi } =
    await config.starknetProvider.getClassAt(ERC20ContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const ERC20Contract = new Contract(
    abi,
    ERC20ContractAddress,
    config.starknetProvider
  );

  const allowance = ERC20Contract.allowance(
    owner,
    config.starknetExecutorContract
  );
  return allowance;
};
