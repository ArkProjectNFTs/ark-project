import { Contract } from "starknet";

import { Config } from "@ark-project/core"

export const getTokenOwner = async (
  config: Config,
  nftContractAddress: string,
  tokenId: bigint
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const nftContract = new Contract(
    abi,
    nftContractAddress,
    config.starknetProvider
  );

  const owner = await nftContract.owner_of(tokenId);
  return owner;
};
