import { RpcProvider } from "starknet";

export const goerliProvider = new RpcProvider({
  nodeUrl: "https://starknet-testnet.public.blastapi.io"
});

export const solisProvider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

export const katanaProvider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:5050"
});

export function getProvider(network: string) {
  switch (network) {
    case "solis":
      return solisProvider;

    case "goerli":
      return goerliProvider;

    case "katana":
      return katanaProvider;

    default:
      return goerliProvider;
  }
}

export const STARKGATE_ADDRESS =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
