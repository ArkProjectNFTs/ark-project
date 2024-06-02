import { AccountInterface, Contract } from "starknet";

import { approveERC721 as approveERC721Core, Config } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useApproveERC721() {
  const config = useConfig();

  async function getApproveERC721(tokenAddress: string, tokenId: bigint) {
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

    const approved = await tokenContract.get_approved(tokenId);

    return approved;
  }

  async function approveERC721(
    starknetAccount: AccountInterface,
    tokenId: bigint,
    tokenAddress: string
  ) {
    let isApproved = await getApproveERC721(tokenAddress, tokenId);
    if (!isApproved) {
      await approveERC721Core(config as Config, {
        starknetAccount,
        contractAddress: tokenAddress.toString(),
        tokenId
      });
    }
  }
  return { approveERC721, getApproveERC721 };
}

export { useApproveERC721 };
