import { AccountInterface, BigNumberish, Contract } from "starknet";

import { approveERC20 as approveERC20Core, Config } from "@ark-project/core";

import { useConfig } from "./useConfig";

export type ApproveERC20Parameters = {
  starknetAccount: AccountInterface;
  startAmount: BigNumberish;
  currencyAddress?: BigNumberish;
};

function useApproveERC20() {
  const config = useConfig();

  async function getAllowance(
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

  async function approveERC20(
    parameters: ApproveERC20Parameters
  ): Promise<any> {
    if (!parameters.currencyAddress) {
      throw new Error(
        "No currency address. Please set currency_address to approveERC20."
      );
    }
    let allowance = await getAllowance(
      parameters.starknetAccount,
      parameters.currencyAddress
    );
    console.log("startAmount", Number(BigInt(parameters.startAmount)));
    console.log("allowance", Number(BigInt(allowance)));
    console.log(
      Number(BigInt(allowance)) >= Number(BigInt(parameters.startAmount))
    );
    if (Number(BigInt(allowance)) < Number(BigInt(parameters.startAmount))) {
      return await approveERC20Core(config as Config, {
        starknetAccount: parameters.starknetAccount,
        contractAddress: parameters.currencyAddress.toString(),
        amount: parameters.startAmount
      });
    }
  }
  return { approveERC20, getAllowance };
}

export { useApproveERC20 };
