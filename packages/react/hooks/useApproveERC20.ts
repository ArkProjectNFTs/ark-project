import { AccountInterface, BigNumberish, Contract } from "starknet";

import { useConfig } from "./useConfig";

export type ApproveERC20Parameters = {
  starknetAccount: AccountInterface;
  startAmount: BigNumberish;
  currencyAddress?: BigNumberish;
};

export default function useApproveERC20() {
  const config = useConfig();

  async function getApproved(
    starknetAccount: AccountInterface,
    currency_address?: BigNumberish
  ) {
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
  }

  return { getApproved };
}
