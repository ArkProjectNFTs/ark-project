import { RpcProvider } from "starknet";

export function getProvider(starknetNetwork: string, solisNetwork: string) {
  let solisNodeUrl: string;
  let starknetNodeUrl: string;
  switch (solisNetwork) {
    case "dev":
      solisNodeUrl = "http://0.0.0.0:7777";
      break;
    case "mainnet":
      solisNodeUrl = "solis.arkproject.dev";
      break;
    case "goerli":
      solisNodeUrl = "staging.solis.arkproject.dev";
      break;
    default:
      throw new Error(`Unsupported solisNetwork: ${solisNetwork}`);
  }

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

  const solisProvider = new RpcProvider({ nodeUrl: solisNodeUrl });
  const starknetProvider = new RpcProvider({ nodeUrl: starknetNodeUrl });

  return { solisProvider, starknetProvider };
}

export function getFeeAddress(network: string) {
  switch (network) {
    case "katana":
      // TODO use deployed ERC20 contract address
      return "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    case "goerli":
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    case "mainnet":
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    default:
      return "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
  }
}
