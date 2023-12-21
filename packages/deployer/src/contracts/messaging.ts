import * as sn from "starknet";

import * as common from "./common";

export async function upgradeMessaging(
  artifactsPath: string,
  deployerAccount: sn.Account,
  provider: sn.RpcProvider,
  contractAddress: string
) {
  const artifacts = common.loadArtifacts(
    artifactsPath,
    "ark_starknet_appchain_messaging"
  );

  const { class_hash } = await deployerAccount.declareIfNot({
    contract: artifacts.sierra,
    casm: artifacts.casm
  });

  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const messagingContract = new sn.Contract(abi, contractAddress, provider);
  messagingContract.connect(deployerAccount);
  const response = await messagingContract.upgrade(class_hash);
  const transactionHash: string = response.transaction_hash;
  if (transactionHash) {
    await provider.waitForTransaction(transactionHash);
  }

  return new sn.Contract(artifacts.sierra.abi, contractAddress, provider);
}

/**
 * Declare and deploys appchain_messaging contract.
 * Returns the contract object.
 */
export async function deployMessaging(
  artifactsPath: string,
  deployerAccount: sn.Account,
  provider: sn.RpcProvider
) {
  const artifacts = common.loadArtifacts(
    artifactsPath,
    "ark_starknet_appchain_messaging"
  );

  const contractCallData = new sn.CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    owner: deployerAccount.address,
    appchain_account: deployerAccount.address
  });

  const deployR = await deployerAccount.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractConstructor
  });

  return new sn.Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}
