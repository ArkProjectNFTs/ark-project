import { cairo, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";
import { NoABIError } from "../../errors/actions.js";

export const getNftOwner = async (
  config: Config,
  nftContractAddress: string,
  tokenId: bigint
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new NoABIError({ docsPath: "/sdk-core/get-nft-owner" });
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
