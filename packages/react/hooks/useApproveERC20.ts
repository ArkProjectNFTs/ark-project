import { AccountInterface, BigNumberish, Contract } from "starknet";

import { approveERC20 as approveERC20Core, Config } from "@ark-project/core";

import { useConfig } from "./useConfig";

export default function useApproveERC20() {
  const config = useConfig();

  async function getApproveERC20(
    starknetAccount: AccountInterface,
    start_amount: BigNumberish,
    currency_address: BigNumberish
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

  async function approveERC20(
    starknetAccount: AccountInterface,
    start_amount: BigNumberish,
    currency_address?: BigNumberish
  ) {
    if (!currency_address) {
      throw new Error(
        "No currency address. Please set currency_address to approveERC20."
      );
    }
    await approveERC20Core(config as Config, {
      starknetAccount,
      contractAddress: currency_address.toString(),
      amount: start_amount
    });
  }
  return { approveERC20 };
}
