import { useContext } from "react";

import { RpcContext } from "../components/RpcContext";

function useArkRpc() {
  const rpcContext = useContext(RpcContext);

  if (rpcContext === undefined) {
    throw new Error("useArkRpc must be used within an ArkProvider");
  }

  const { rpcProvider } = rpcContext;

  return { rpcProvider };
}

export { useArkRpc };
