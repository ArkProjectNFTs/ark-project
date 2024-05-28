import * as sn from "starknet";

import { loadArtifacts } from "./common";
import * as common from "./common";

/**
 * Declare and deploys orderbook contract.
 * Returns the contract object.
 */
export async function deployOrderBook(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider,
  adminAddress: string,
  chain_id: string
) {
  const artifacts = loadArtifacts(artifactsPath, "ark_orderbook_orderbook");
  const contractCallData = new sn.CallData(artifacts.sierra.abi);

  console.log(chain_id);
  console.log(adminAddress);
  const deployR = await account.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractCallData.compile("constructor", {
      admin: adminAddress,
      chain_id: chain_id
    } as sn.RawArgs)
  });

  if (deployR.declare.transaction_hash) {
    await provider.waitForTransaction(deployR.declare.transaction_hash);
  }

  return new sn.Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}

export async function upgradeOrderbook(
  artifactsPath: string,
  deployerAccount: sn.Account,
  provider: sn.RpcProvider,
  contractAddress: string
) {
  const artifacts = common.loadArtifacts(
    artifactsPath,
    "ark_orderbook_orderbook"
  );

  const { class_hash, transaction_hash } = await deployerAccount.declareIfNot({
    contract: artifacts.sierra,
    casm: artifacts.casm
  });

  if (transaction_hash) {
    await provider.waitForTransaction(transaction_hash);
  }

  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const orderbookContract = new sn.Contract(abi, contractAddress, provider);
  orderbookContract.connect(deployerAccount);
  const response = await orderbookContract.upgrade(class_hash);
  const transactionHash: string = response.transaction_hash;
  if (transactionHash) {
    await provider.waitForTransaction(transactionHash);
  }

  return new sn.Contract(artifacts.sierra.abi, contractAddress, provider);
}

export async function updateExecutorAddress(
  provider: sn.RpcProvider,
  deployerAccount: sn.Account,
  contractAddress: string,
  executorAddress: string
) {
  const { abi } = await provider.getClassAt(contractAddress);
  // if (abi === undefined) {
  //   throw new Error("no abi.");
  // }
  // const executorContract = new sn.Contract(abi, contractAddress, provider);
  // executorContract.connect(deployerAccount);
  // const response =
  //   await executorContract.update_starknet_executor_address(executorAddress);
  // await provider.waitForTransaction(response.transaction_hash);
}
