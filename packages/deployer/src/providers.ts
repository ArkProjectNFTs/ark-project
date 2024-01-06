import { RpcProvider } from "starknet";

export function getStarknetProvider(starknetNetwork: string) {
  let starknetNodeUrl: string;
  switch (starknetNetwork) {
    case "dev":
      starknetNodeUrl = process.env.STARKNET_NODE_URL_DEV || "";
      break;
    case "mainnet":
      starknetNodeUrl = process.env.STARKNET_NODE_URL_MAINNET || "";
      break;
    case "goerli":
      starknetNodeUrl = process.env.STARKNET_NODE_URL_GOERLI || "";
      break;
    default:
      throw new Error(`Unsupported starknetNetwork: ${starknetNetwork}`);
  }

  return new RpcProvider({ nodeUrl: starknetNodeUrl });
}

export function getSolisProvider(solisNetwork?: string) {
  let solisNodeUrl: string;
  switch (solisNetwork) {
    case "dev":
      solisNodeUrl = process.env.SOLIS_NODE_URL_DEV || "";
      break;
    case "mainnet":
      solisNodeUrl = process.env.SOLIS_NODE_URL_GOERLI || "";
      break;
    case "goerli":
      solisNodeUrl = process.env.SOLIS_NODE_URL_MAINNET || "";
      break;
    default:
      throw new Error(`Unsupported solisNetwork: ${solisNetwork}`);
  }

  return new RpcProvider({ nodeUrl: solisNodeUrl });
}

export function getFeeAddress(network: string) {
  switch (network) {
    case "dev":
      return "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    case "goerli":
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    case "mainnet":
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    default:
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
  }
}
