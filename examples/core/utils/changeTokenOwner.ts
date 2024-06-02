import { AccountInterface, cairo, CallData } from "starknet";

import { Config } from "@ark-project/core"

export const changeTokenOwner = async (
  config: Config,
  nftContractAddress: string,
  owner: AccountInterface,
  to: string,
  tokenId: bigint
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const hash_calldata = CallData.compile({
    from: owner.address,
    to,
    tokenId: cairo.uint256(tokenId)
  });

  await owner.execute({
    contractAddress: nftContractAddress,
    entrypoint: "transfer_from",
    calldata: hash_calldata
  });

  return;
};
