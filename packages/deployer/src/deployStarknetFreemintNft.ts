import { promises as fs } from "fs";

import { CallData, Contract } from "starknet";

import { SOLIS_NETWORK, STARKNET_NETWORK } from "./constants";
import { loadArtifacts } from "./contracts/common";
import { deployERC20 } from "./contracts/erc20";
import { getProvider } from "./providers";
import {
  getContractsFilePath,
  getExistingAccounts,
  getExistingContracts
} from "./utils";

const loading = require("loading-cli");
const artifactsPath = "../../contracts/target/dev/";

export async function deployStarknetContracts() {
  const { starknetProvider } = getProvider(STARKNET_NETWORK, SOLIS_NETWORK);
  const { starknetAdminAccount } = getExistingAccounts(
    STARKNET_NETWORK,
    SOLIS_NETWORK
  );

  let existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.account.address}`);
  console.log("");

  const starknetSpinner = loading("Deploying Nft Contract...").start();
  const artifacts = loadArtifacts(artifactsPath, "ark_tokens_FreeMintNFT");

  const contractCallData = new CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    name: "ARK",
    symbol: "ARK"
  });

  const deployR = await starknetAdminAccount.account.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractConstructor
  });

  const nftContract = new Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    starknetProvider
  );

  existingContracts = {
    ...existingContracts,
    [STARKNET_NETWORK]: {
      ...existingContracts[STARKNET_NETWORK],
      nftContract: nftContract.address
    }
  };

  await fs.writeFile(getContractsFilePath(), JSON.stringify(existingContracts));

  let ethContract: Contract | undefined;
  if (STARKNET_NETWORK === "dev") {
    starknetSpinner.text = "Deploying Eth Contract...";

    ethContract = await deployERC20(
      artifactsPath,
      starknetAdminAccount.account,
      starknetProvider,
      "ETH",
      "ETH"
    );

    existingContracts = {
      ...existingContracts,
      [STARKNET_NETWORK]: {
        ...existingContracts[STARKNET_NETWORK],
        eth: ethContract.address
      }
    };

    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  starknetSpinner.stop();
  console.log("- Nft contract: ", nftContract.address);
  if (ethContract) {
    console.log("- Eth contract: ", ethContract.address);
  }
}

deployStarknetContracts();
