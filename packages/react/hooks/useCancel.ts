"use client";

import { useState } from "react";

import { Account, AccountInterface } from "starknet";

import {
  CancelInfo,
  cancelOrder as cancelOrderCore,
  Config
} from "@ark-project/core";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useCancel() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");
  const owner = useOwner();
  const config = useConfig();

  async function cancel(
    starknetAccount: AccountInterface,
    cancelInfo: CancelInfo
  ) {
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

    const arkAccount = new Account(
      rpcProvider,
      burner_address,
      burner_private_key
    );

    try {
      setStatus("loading");
      await cancelOrderCore(config as Config, {
        starknetAccount,
        arkAccount: arkAccount,
        cancelInfo,
        owner
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { cancel, status };
}
