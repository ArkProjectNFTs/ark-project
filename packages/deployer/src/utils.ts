import { promises as fs } from "fs";
import { join } from "path";

import loading from "loading-cli";
import { Account, CallData, Contract, RpcProvider } from "starknet";

import { loadArtifacts } from "./contracts/common";
import { deployERC20 } from "./contracts/erc20";
import { deployExecutor, upgradeExecutor } from "./contracts/executor";
import { deployMessaging, upgradeMessaging } from "./contracts/messaging";
import {
  getFeeAddress,
  getSolisProvider,
  getStarknetProvider
} from "./providers";

export function getExistingSolisAccounts(solisNetwork: string) {
  const solisProvider = getSolisProvider(solisNetwork);
  const solisAccounts = [
    {
      address:
        process.env.SOLIS_ACCOUNT1_ADDRESS ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.SOLIS_ACCOUNT1_PRIVATE_KEY ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.SOLIS_ACCOUNT1_PUBLIC_KEY ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
      deployed: true
    },
    {
      address:
        process.env.SOLIS_ACCOUNT2_ADDRESS ||
        "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
      privateKey:
        process.env.SOLIS_ACCOUNT2_PRIVATE_KEY ||
        "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
      publicKey:
        process.env.SOLIS_ACCOUNT2_PUBLIC_KEY ||
        "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
      deployed: true
    }
  ];

  return buildAccounts(solisProvider, solisAccounts);
}

export function getExistingStarknetAccounts(starknetNetwork: string) {
  const starknetProvider = getStarknetProvider(starknetNetwork);

  const starknetAccounts = [
    {
      address:
        process.env.STARKNET_ACCOUNT1_ADDRESS ||
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
      privateKey:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x1800000000300000180000000000030000000000003006001800006600",
      publicKey:
        process.env.STARKNET_ACCOUNT1_PUBLIC_KEY ||
        "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
      deployed: true
    },
    {
      address:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
      privateKey:
        process.env.STARKNET_ACCOUNT1_PRIVATE_KEY ||
        "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
      publicKey:
        process.env.STARKNET_ACCOUNT1_PUBLIC_KEY ||
        "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
      deployed: true
    }
  ];

  return buildAccounts(starknetProvider, starknetAccounts);
}

function buildAccounts(provider: RpcProvider, accountData: any[]): Account[] {
  return accountData.map(({ address, privateKey }) => {
    return new Account(provider, address, privateKey);
  });
}

function getMessagingFilePath(network: string): string {
  switch (network) {
    case "mainnet":
      return join(__dirname, "../../../crates/solis/messaging.json");
    case "testnet":
      return join(__dirname, "../../../crates/solis/messaging.goerli.json");
    case "dev":
    default:
      return join(__dirname, "../../../crates/solis/messaging.local.json");
  }
}

export function getContractsFilePath() {
  return join(__dirname, `../../../contracts.json`);
}

export async function getExistingContracts() {
  try {
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    const jsonContent = JSON.parse(fileContent);
    return jsonContent;
  } catch (error) {
    console.error("Erreur lors de la lecture du fichier :", error);
    throw error;
  }
}

export async function deployFreemintContracts(
  network: string,
  artifactsPath: string
) {
  const starknetProvider = getStarknetProvider(network);
  const starknetAccounts = getExistingStarknetAccounts(network);
  const [starknetAdminAccount, ...otherUsers] = starknetAccounts;

  let existingContracts = await getExistingContracts();

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
  const artifacts = loadArtifacts(artifactsPath, "ark_tokens_FreeMintNFT");

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

  existingContracts = {
    ...existingContracts,
    [network]: {
      ...existingContracts[network],
      nftContract: nftContract.address
    }
  };

  await fs.writeFile(getContractsFilePath(), JSON.stringify(existingContracts));

  let ethContract: Contract | undefined;
  if (network === "dev") {
    starknetSpinner.text = "Deploying Eth Contract...";

    ethContract = await deployERC20(
      artifactsPath,
      starknetAdminAccount,
      starknetProvider,
      "ETH",
      "ETH"
    );

    existingContracts = {
      ...existingContracts,
      [network]: {
        ...existingContracts[network],
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

export async function deployStarknetContracts(
  network: string,
  artifactsPath: string
) {
  const messagingFilePath = getMessagingFilePath(network);
  const starknetProvider = getStarknetProvider(network);
  const starknetAccounts = getExistingStarknetAccounts(network);

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

  const starknetSpinner = loading("💅 Deploying Starknet Contracts...").start();

  let messagingContract: Contract;
  if (existingContracts[network].messaging && !network.includes("dev")) {
    starknetSpinner.text = "Upgrading Messaging Contract...";
    messagingContract = await upgradeMessaging(
      artifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[network].messaging
    );
  } else {
    starknetSpinner.text = "Deploying Messaging Contract...";
    messagingContract = await deployMessaging(
      artifactsPath,
      starknetAdminAccount,
      starknetProvider
    );
    existingContracts[network].messaging = messagingContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );
  }

  starknetSpinner.text = "⚡ Deploying Executor Contract...";
  let executorContract: Contract;
  if (existingContracts[network].executor && !network.includes("dev")) {
    starknetSpinner.text = "⚡ Upgrading Executor Contract...";
    executorContract = await upgradeExecutor(
      artifactsPath,
      starknetAdminAccount,
      starknetProvider,
      existingContracts[network].messaging
    );
  } else {
    starknetSpinner.text = "⚡ Deploying Executor Contract...";
    executorContract = await deployExecutor(
      artifactsPath,
      starknetAdminAccount,
      starknetProvider,
      getFeeAddress(network),
      messagingContract.address
    );
    existingContracts[network].executor = executorContract.address;
    await fs.writeFile(
      getContractsFilePath(),
      JSON.stringify(existingContracts)
    );

    const messagingFilePath = getMessagingFilePath(network);
    const configData = JSON.parse(await fs.readFile(messagingFilePath, "utf8"));
    configData.contract_address = messagingContract.address;
    await fs.writeFile(messagingFilePath, JSON.stringify(configData, null, 2));
  }

  starknetSpinner.stop();

  console.log("STARKNET CONTRACTS");
  console.log("==================\n");
  console.log(`| Messaging contract | ${messagingContract.address}`);
  console.log(`| Executor contract  | ${executorContract.address}`);
}

export async function cleanContracts() {
  await fs.writeFile(
    getContractsFilePath(),
    JSON.stringify({
      testnet: {},
      mainnet: {},
      dev: {}
    })
  );
}
