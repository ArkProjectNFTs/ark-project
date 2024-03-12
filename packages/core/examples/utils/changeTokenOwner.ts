import { AccountInterface, BigNumberish, cairo, CairoOption, CairoOptionVariant, CallData, Uint256 } from "starknet";

import { Config } from "../../src/createConfig";
import { fetchOrCreateAccount } from "../../src";
import { getCurrentTokenId } from "./getCurrentTokenId";
import { config } from "../config";

export const changeTokenOwner = async (
  config: Config,
  nftContractAddress: string,
  owner: AccountInterface,
  to: string,
  tokenId: BigNumberish
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const hash_calldata = CallData.compile({
    from: owner.address,
    to,
    tokenId: cairo.uint256(tokenId),
  });

  const result = await owner.execute({
    contractAddress: config.starknetContracts.nftContract,
    entrypoint: "transfer_from",
    calldata: hash_calldata
  });

  console.log("result change", result)
  return;
};
