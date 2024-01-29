import { Contract } from "starknet";

import { Config } from "../../src/createConfig";

export const getCurrentTokenId = async (
  config: Config,
  nftContractAddress: string
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

  const token_id = await nftContract.get_current_token_id();
  // we need to subtract 1 because the contract returns the next token id
  return token_id - BigInt(1);
};
