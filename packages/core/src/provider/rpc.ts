import { RpcProvider } from "starknet";

type Provider = {
  nodeUrl?: string;
};

// Initialize the RPC provider with the ArkChain node URL
export const initProvider = ({ nodeUrl = "http://0.0.0.0:7777" }: Provider) => {
  const provider = new RpcProvider({
    nodeUrl: nodeUrl
  });

  return provider;
};

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
