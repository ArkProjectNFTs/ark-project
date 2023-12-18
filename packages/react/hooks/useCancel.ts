import { useState } from "react";

import { Account } from "starknet";

import { cancelOrder as cancelOrderCore } from "@ark-project/core";
import { CancelInfo } from "@ark-project/core/src/types";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";

export default function useCancel() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");

  async function cancel(cancelInfo: CancelInfo) {
    const burner_address = localStorage.getItem("burner_address");
    const burner_private_key = localStorage.getItem("burner_private_key");
    const burner_public_key = localStorage.getItem("burner_public_key");
    if (
      burner_address === null ||
      burner_private_key === null ||
      burner_public_key === null
    ) {
      throw new Error("No burner wallet in local storage");
    }

    try {
      setStatus("loading");
      await cancelOrderCore(
        rpcProvider,
        new Account(rpcProvider, burner_address, burner_private_key),
        cancelInfo
      );
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { cancel, status };
}
