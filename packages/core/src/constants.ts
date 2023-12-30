const ORDER_BOOK_ADDRESS =
  "0x228b5856d5f0e231fe28ed0815ac5a4ae7ab585ef15b20b6d5e48d02c8b41ec";

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

// Get the current networks from environment variables
const starknetNetwork = (process.env.STARKNET_NETWORK_ID ||
  "local") as keyof ContractConfig;
const solisNetwork = (process.env.SOLIS_NETWORK_ID ||
  "local") as keyof ContractConfig;

// Assign constants based on the current networks
export const STARKNET_ORDER_BOOK_ADDRESS =
  contracts[starknetNetwork]?.orderbook || "";
export const STARKNET_ETH_ADDRESS = contracts[starknetNetwork]?.eth || "";
export const STARKNET_NFT_ADDRESS =
  contracts[starknetNetwork]?.nftContract || "";
export const STARKNET_EXECUTOR_ADDRESS =
  contracts[starknetNetwork]?.executor || "";

export const SOLIS_ORDER_BOOK_ADDRESS =
  contracts[solisNetwork]?.orderbook || "";
// Add other Solis constants as needed

export const SOLIS_ACCOUNT_CLASS_HASH =
  "0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";

export const STARKNET_ADMIN_ACCOUNT_ADDRESS =
  "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973";
