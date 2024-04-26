import { AccountInterface, BigNumberish, Contract } from "starknet";

import { Config } from "../../createConfig";

export const getApprovedErc721 = async (
  starknetAccount: AccountInterface,
  tokenAddress: BigNumberish,
  config: Config
) => {
  const compressedContract = await config?.starknetProvider.getClassAt(
    tokenAddress.toString()
  );
  if (compressedContract?.abi === undefined) {
    throw new Error("no abi.");
  }
  const tokenContract = new Contract(
    compressedContract?.abi,
    tokenAddress.toString(),
    config?.starknetProvider
  );
  const approved = await tokenContract.isApprovedForAll(
    starknetAccount.address,
    config?.starknetContracts.executor
  );
  return approved;
};
