import { BigNumberish, cairo, CairoOption, CairoOptionVariant, Call, CallData, Contract, Uint256 } from "starknet";

import { Config } from "../../src/createConfig";
import { STARKNET_ETH_ADDRESS, STARKNET_NFT_ADDRESS } from "../constants";
import { getStarknetProvider } from "../../../deployer/src/providers";

export const getOwnerOf = async (
  config: Config,
  nftContractAddress: string,
  tokenId: number
) => {

  const starknetProvider = getStarknetProvider("dev");
  console.log("starknetProvider", starknetProvider);
  const { abi } = await starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  console.log("abi", abi);

  const erc721Contract =
    new Contract(abi, nftContractAddress, starknetProvider);

  const result = await erc721Contract.call('owner_of', [tokenId]);
  console.log(result);
  return result;
};
