"use client";

import { useState } from "react";

import {
  fulfillAuction,
  FulfillAuctionParameters,
  FulfillAuctionResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

function useFulfillAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FulfillAuctionResult>();
  const config = useConfig();

  async function fulfill(parameters: FulfillAuctionParameters) {
    if (!config) {
      throw new Error("Invalid config.");
    }

    setStatus("loading");

    try {
      const fulfillAuctionResult = await fulfillAuction(config, parameters);

      setStatus("success");
      setResult(fulfillAuctionResult);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return {
    fulfill,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useFulfillAuction };
