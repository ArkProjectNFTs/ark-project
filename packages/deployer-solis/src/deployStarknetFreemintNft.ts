import { promises as fs } from "fs";

import { program } from "commander";
import loading from "loading-cli";
import { CallData, Contract } from "starknet";

import { ARTIFACTS_PATH } from "./constants";
import { loadArtifacts } from "./contracts/common";
import { deployERC20 } from "./contracts/erc20";
import { getStarknetProvider } from "./providers";
import { ProviderNetwork } from "./types";
import {
  getContractsFilePath,
  getExistingContracts,
  getStarknetAccounts
} from "./utils";

export async function deployStarknetContracts(
  starknetNetwork: ProviderNetwork
) {
  const { provider: starknetProvider } = getStarknetProvider(starknetNetwork);
  const { starknetAdminAccount } = getStarknetAccounts(starknetNetwork);
  let existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  console.log("");

  const starknetSpinner = loading("Deploying Nft Contract...").start();
  const artifacts = loadArtifacts(ARTIFACTS_PATH, "ark_tokens_FreeMintNFT");

  const contractCallData = new CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    name: "ARKTEST",
    symbol: "ARKTEST"
  });

  const deployR = await starknetAdminAccount.declareAndDeploy({
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
    [starknetNetwork]: {
      ...existingContracts[starknetNetwork],
      nftContract: nftContract.address
    }
  };

  await fs.writeFile(getContractsFilePath(), JSON.stringify(existingContracts));

  let ethContract: Contract | undefined;
  if (starknetNetwork === "dev") {
    starknetSpinner.text = "Deploying Eth Contract...";

    ethContract = await deployERC20(
      ARTIFACTS_PATH,
      starknetAdminAccount,
      starknetProvider,
      "ETH",
      "ETH"
    );

    existingContracts = {
      ...existingContracts,
      [starknetNetwork]: {
        ...existingContracts[starknetNetwork],
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

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;

deployStarknetContracts(starknetNetwork);
