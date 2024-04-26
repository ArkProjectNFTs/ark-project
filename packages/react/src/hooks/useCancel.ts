"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  CancelInfo,
  cancelOrder as cancelOrderCore,
  Config
} from "@ark-project/core";

import { Status } from "../types";
import { useBurnerWallet } from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

type CancelParameters = {
  starknetAccount: AccountInterface;
} & CancelInfo;

function useCancel() {
  const [status, setStatus] = useState<Status>("idle");
  const owner = useOwner();
  const config = useConfig();
  const arkAccount = useBurnerWallet();
  async function cancel(parameters: CancelParameters) {
    if (!arkAccount) throw new Error("No burner wallet.");
    try {
      setStatus("loading");
      await cancelOrderCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount: arkAccount,
        cancelInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId
        },
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

export { useCancel };
