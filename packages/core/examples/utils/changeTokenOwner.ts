import { BigNumberish, cairo, CairoOption, CairoOptionVariant, CallData, Uint256 } from "starknet";

import { Config } from "../../src/createConfig";
import { fetchOrCreateAccount } from "../../src";
import { getCurrentTokenId } from "./getCurrentTokenId";

export const changeTokenOwner = async (
  config: Config,
  nftContractAddress: string,
  from: string,
  to: string,
  tokenId: BigNumberish
) => {
  const { abi } = await config.starknetProvider.getClassAt(nftContractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const token =  new CairoOption<Uint256>(
    CairoOptionVariant.Some,
    cairo.uint256(tokenId)
  );

  const adminAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.SOLIS_ADMIN_ADDRESS_DEV,
    process.env.SOLIS_ADMIN_ADDRESS_DEV
  );

  const nTokenId = await getCurrentTokenId(config, nftContractAddress) +  BigInt(1);
  console.log("nTokenId", nTokenId)
  const hash_calldata = CallData.compile({
    from,
    to,
    tokenId: cairo.uint256(nTokenId),
  });

  const result = await adminAccount.execute({
    contractAddress: config.starknetContracts.nftContract,
    entrypoint: "transfer_from",
    calldata: hash_calldata
  });

  console.log("result change", result)
  return;
};
