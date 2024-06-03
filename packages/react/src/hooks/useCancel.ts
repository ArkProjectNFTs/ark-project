"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  CancelInfo,
  cancelOrder as cancelOrderCore,
  Config
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

type CancelParameters = {
  starknetAccount: AccountInterface;
} & CancelInfo;

function useCancel() {
  const [status, setStatus] = useState<Status>("idle");
  const config = useConfig();
  async function cancel(parameters: CancelParameters) {
    try {
      setStatus("loading");
      await cancelOrderCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        cancelInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId
        }
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
