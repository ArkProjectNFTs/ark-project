import { RpcProvider } from "starknet";

export function getProvider(solisNetwork: string, starknetNetwork: string) {
  let solisNodeUrl: string;
  let starknetNodeUrl: string;

  switch (solisNetwork) {
    case "local":
      solisNodeUrl = "http://0.0.0.0:7777";
      break;
    case "mainnet":
      solisNodeUrl =
        process.env.MAINNET_SOLIS_NODE_URL ?? "default_mainnet_solis_url"; // Replace with default or throw error if not set
      break;
    case "testnet":
      solisNodeUrl =
        process.env.TESTNET_SOLIS_NODE_URL ?? "default_testnet_solis_url"; // Replace with default or throw error if not set
      break;
    default:
      throw new Error(`Unsupported solisNetwork: ${solisNetwork}`);
  }

  switch (starknetNetwork) {
    case "local":
      starknetNodeUrl = "http://0.0.0.0:5050";
      break;
    case "mainnet":
      starknetNodeUrl =
        process.env.MAINNET_STARKNET_NODE_URL ?? "default_mainnet_starknet_url"; // Replace with default or throw error if not set
      break;
    case "testnet":
      starknetNodeUrl =
        process.env.TESTNET_STARKNET_NODE_URL ?? "default_testnet_starknet_url"; // Replace with default or throw error if not set
      break;
    default:
      throw new Error(`Unsupported starknetNetwork: ${starknetNetwork}`);
  }

  const solisProvider = new RpcProvider({ nodeUrl: solisNodeUrl });
  const starknetProvider = new RpcProvider({ nodeUrl: starknetNodeUrl });

  return { solisProvider, starknetProvider };
}

export function getFeeAddress(network: string) {
  switch (network) {
    case "katana":
      return "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    default:
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
  }
}
