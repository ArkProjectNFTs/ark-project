import { CallData, Contract } from "starknet";

import { loadArtifacts } from "./contracts/common";
import { getProvider } from "./providers";
import { getExistingAccounts, getExistingContracts } from "./utils";

const loading = require("loading-cli");
const artifactsPath = "../../crates/ark-contracts/common/target/dev/";

const STARKNET_NETWORK = "katana";

export async function deployStarknetRandomNft() {
  const starknetProvider = getProvider(STARKNET_NETWORK);
  const starknetAccounts = await getExistingAccounts(STARKNET_NETWORK);

  const [starknetAdminAccount, ...otherUsers] = starknetAccounts;
  const existingContracts = await getExistingContracts();

  console.log("\nSTARKNET ACCOUNTS");
  console.log("=================\n");
  console.log(`| Admin account |  ${starknetAdminAccount.address}`);
  if (otherUsers.length > 0) {
    otherUsers.forEach((user, index) => {
      console.log(`| User ${index}        | ${user.address}`);
    });
  }

  console.log("");

  const starknetSpinner = loading("Deploying Nft Contract...").start();
  const artifacts = loadArtifacts(artifactsPath, "ark_common_FreeMintNFT");

  const contractCallData = new CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    name: "ARK",
    symbol: "ARK"
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

  starknetSpinner.stop();
  console.log("- Nft contract: ", nftContract.address);
}

deployStarknetRandomNft();
