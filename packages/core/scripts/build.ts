import fs from "fs";
import path from "path";

type ContractConfig = {
  [key: string]: {
    messaging?: string;
    executor?: string;
    nftContract?: string;
    eth?: string;
    orderbook?: string;
  };
};

const CONTRACTS_JSON_PATH = path.join(__dirname, "..", "../../contracts.json");
const CONTRACTS_TS_PATH = path.join(
  __dirname,
  "..",
  "src/constants/contracts.ts"
);
const EXAMPLES_CONTRACTS_TS_PATH = path.join(
  __dirname,
  "..",
  "examples/constants/contracts.ts"
);

const NETWORKS = {
  testnet: "goerli", // TODO: change to sepolia
  mainnet: "mainnet",
  dev: "local"
};

const readJson = (filePath: string): ContractConfig => {
  const rawJson = fs.readFileSync(filePath, "utf8");
  return JSON.parse(rawJson);
};

const constructContractConstants = (
  contracts: ContractConfig,
  network: string,
  networkName: string
): string =>
  `
export const STARKNET_ETH_ADDRESS_${networkName} = "${
    contracts[network]?.eth || ""
  }";
export const STARKNET_NFT_ADDRESS_${networkName} = "${
    contracts[network]?.nftContract || ""
  }";
export const STARKNET_EXECUTOR_ADDRESS_${networkName} = "${
    contracts[network]?.executor || ""
  }";
export const SOLIS_ORDER_BOOK_ADDRESS_${networkName} = "${
    contracts[network]?.orderbook || ""
  }";
`.trim();

const constructAllConstants = (contracts: ContractConfig) =>
  Object.entries(NETWORKS)
    .map(([networkName, network]) =>
      constructContractConstants(contracts, network, networkName.toUpperCase())
    )
    .join("\n\n");

const writeToFile = (filePath: string, data: string) => {
  fs.writeFileSync(filePath, data);
};

// Main execution
try {
  const contracts = readJson(CONTRACTS_JSON_PATH);
  const contractConstants = constructAllConstants(contracts);

  writeToFile(CONTRACTS_TS_PATH, contractConstants);
  writeToFile(
    EXAMPLES_CONTRACTS_TS_PATH,
    `
    export const STARKNET_NFT_ADDRESS_MAINNET = "${
      contracts.mainnet?.nftContract || ""
    }";
    export const STARKNET_NFT_ADDRESS_TESTNET = "${
      contracts.goerli?.nftContract || ""
    }";
    export const STARKNET_NFT_ADDRESS_DEV = "${
      contracts.local?.nftContract || ""
    }";
  `
  );
} catch (error) {
  console.error("An error occurred:", error);
}
