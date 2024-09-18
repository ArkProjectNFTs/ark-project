import { type Account, CallData, Contract, type RpcProvider } from "starknet";

import { loadArtifacts } from "../contracts/common";

export async function setDefaultFees(
  provider: RpcProvider,
  deployerAccount: Account,
  contractAddress: string,
  receiver: string
) {
  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const tokenContract = new Contract(abi, contractAddress, provider);
  tokenContract.connect(deployerAccount);

  const response = await tokenContract.set_default_royalty(receiver, {
    numerator: 75,
    denominator: 10000
  });
  await provider.waitForTransaction(response.transaction_hash);
}

export async function deployERC721Royalties(
  artifactsPath: string,
  deployerAccount: Account,
  provider: RpcProvider,
  feeReceiver: string
) {
  const artifacts = loadArtifacts(
    artifactsPath,
    "ark_tokens_FreeMintNFTRoyalty"
  );

  const contractCallData = new CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    name: "ARKTESTROYALTY",
    symbol: "ATR",
    base_uri:
      "https://ipfs.io/ipfs/QmVXJ2eEx3xrD2mSdPqLBEEYM5obj6DRYkn5yant6rXPmw/",
    owner: deployerAccount.address // deployer is the owner in our case
  });

  const deployR = await deployerAccount.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractConstructor
  });

  setDefaultFees(
    provider,
    deployerAccount,
    deployR.deploy.contract_address,
    feeReceiver
  );

  return new Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}
