import { RpcProvider } from "starknet";

export function getProvider(starknetNetwork: string, solisNetwork: string) {
  let solisNodeUrl: string;
  let starknetNodeUrl: string;
  console.log("solisNetwork", solisNetwork);
  console.log("starknetNetwork", starknetNetwork);
  switch (solisNetwork) {
    case "local":
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
    case "local":
      starknetNodeUrl = "http://0.0.0.0:5050";
      break;
    case "mainnet":
      starknetNodeUrl = "https://juno.arkproject.dev";
      break;
    case "goerli":
      starknetNodeUrl = "https://juno.testnet.arkproject.dev";
      break;
    default:
      throw new Error(`Unsupported starknetNetwork: ${starknetNetwork}`);
  }
  console.log(starknetNodeUrl);
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
