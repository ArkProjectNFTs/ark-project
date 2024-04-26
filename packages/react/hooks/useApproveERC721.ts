import { AccountInterface, BigNumberish, Contract } from "starknet";

import { useConfig } from "./useConfig";

export default function useApproveERC721() {
  const config = useConfig();

  async function getApproved(
    starknetAccount: AccountInterface,
    tokenAddress: BigNumberish
  ) {
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
  }

  return { getApproved };
}
