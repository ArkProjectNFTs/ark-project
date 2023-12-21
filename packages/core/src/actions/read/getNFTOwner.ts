import { cairo, CallData, Contract, RpcProvider } from "starknet";

export const getNftOwner = async (
  provider: RpcProvider,
  nftContractAddress: string,
  tokenId: bigint
) => {
  const { abi } = await provider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const nftContract = new Contract(abi, nftContractAddress, provider);

  const ownerAddress: bigint = await nftContract.owner_of(
    CallData.compile({
      token_id: cairo.uint256(tokenId)
    })
  );

  return `0x${ownerAddress.toString(16).padStart(64, "0")}`;
};
