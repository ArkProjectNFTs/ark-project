import * as sn from "starknet";

import * as common from "./common";

function getArtifacts(artifactsPath: string) {
  return common.loadArtifacts(artifactsPath, "ark_starknet_executor");
}

export async function upgradeExecutor(
  artifactsPath: string,
  deployerAccount: sn.Account,
  provider: sn.RpcProvider,
  contractAddress: string
) {
  const artifacts = getArtifacts(artifactsPath);

  const { class_hash } = await deployerAccount.declareIfNot({
    contract: artifacts.sierra,
    casm: artifacts.casm
  });

  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const executorContract = new sn.Contract(abi, contractAddress, provider);
  executorContract.connect(deployerAccount);
  const response = await executorContract.upgrade(class_hash);
  const transactionHash: string = response.transaction_hash;
  if (transactionHash) {
    await provider.waitForTransaction(transactionHash);
  }

  return new sn.Contract(artifacts.sierra.abi, contractAddress, provider);
}

export async function updateOrderbookAddress(
  provider: sn.RpcProvider,
  deployerAccount: sn.Account,
  contractAddress: string,
  orderbookAddress: string
) {
  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const executorContract = new sn.Contract(abi, contractAddress, provider);
  executorContract.connect(deployerAccount);
  const response =
    await executorContract.update_orderbook_address(orderbookAddress);
  await provider.waitForTransaction(response.transaction_hash);
}

/**
 * Declare and deploys executor contract.
 * Returns the contract object.
 */
export async function deployExecutor(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider,
  ethContractAddress: string,
  messagingAddress: string
) {
  const artifacts = getArtifacts(artifactsPath);

  const contractCallData = new sn.CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    admin_address: account.address,
    eth_contract_address: ethContractAddress,
    messaging_address: messagingAddress
  });

  const deployR = await account.declareAndDeploy({
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
