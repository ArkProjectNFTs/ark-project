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

// Read contract.json
const contractJsonPath = path.join(__dirname, "..", "../../contracts.json");
const contractJson = fs.readFileSync(contractJsonPath, "utf8");
const contracts: ContractConfig = JSON.parse(contractJson);

const contractsFilePath = path.join(
  __dirname,
  "..",
  "src/constants/contracts.ts"
);

console.log(contracts);

const testnet = "goerli"; // TODO: change to sepolia

fs.writeFileSync(
  contractsFilePath,
  `export const STARKNET_ETH_ADDRESS_TESTNET = "${
    contracts[testnet]?.eth || ""
  }";
export const STARKNET_ETH_ADDRESS_MAINNET = "${contracts.mainnet?.eth || ""}";
export const STARKNET_ETH_ADDRESS_DEV = "${contracts.local?.eth || ""}";

export const STARKNET_NFT_ADDRESS_TESTNET = "${
    contracts[testnet]?.nftContract || ""
  }";
export const STARKNET_NFT_ADDRESS_MAINNET = "${
    contracts.mainnet?.nftContract || ""
  }";
export const STARKNET_NFT_ADDRESS_DEV = "${contracts.local?.nftContract || ""}";

export const STARKNET_EXECUTOR_ADDRESS_TESTNET = "${
    contracts[testnet]?.executor || ""
  }";
export const STARKNET_EXECUTOR_ADDRESS_MAINNET = "${
    contracts.mainnet?.executor || ""
  }";
export const STARKNET_EXECUTOR_ADDRESS_DEV = "${
    contracts.local?.executor || ""
  }";

export const SOLIS_ORDER_BOOK_ADDRESS_TESTNET = "${
    contracts[testnet]?.orderbook || ""
  }";
export const SOLIS_ORDER_BOOK_ADDRESS_MAINNET = "${
    contracts.mainnet?.orderbook || ""
  }";
export const SOLIS_ORDER_BOOK_ADDRESS_DEV = "${
    contracts.local?.orderbook || ""
  }";`
);
