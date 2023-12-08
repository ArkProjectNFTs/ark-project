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
