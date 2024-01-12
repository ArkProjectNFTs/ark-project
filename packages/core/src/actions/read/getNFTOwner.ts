import { cairo, CallData, Contract } from "starknet";

import { Config } from "../../createConfig";

export const getNftOwner = async (
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

  const ownerAddress: bigint = await nftContract.owner_of(
    CallData.compile({
      token_id: cairo.uint256(tokenId)
    })
  );

  return `0x${ownerAddress.toString(16).padStart(64, "0")}`;
};
