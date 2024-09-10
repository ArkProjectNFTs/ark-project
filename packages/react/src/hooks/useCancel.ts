"use client";

import { useState } from "react";

import {
  cancelOrder as cancelOrderCore,
  CancelOrderParameters,
  CancelOrderResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

function useCancel() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CancelOrderResult>();
  const config = useConfig();

  async function cancel(parameters: CancelOrderParameters) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const cancelResult = await cancelOrderCore(config, parameters);

      setStatus("success");
      setResult(cancelResult);
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return {
    cancel,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useCancel };
