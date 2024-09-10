"use client";

import { useState } from "react";

import {
  fulfillOffer as fulfillOfferCore,
  FulfillOfferParameters,
  FulfillOfferResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

function useFulfillOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FulfillOfferResult>();
  const config = useConfig();

  async function fulfillOffer(parameters: FulfillOfferParameters) {
    if (!config) {
      throw new Error("Invalid config.");
    }

    setStatus("loading");

    try {
      const fulfillOfferResult = await fulfillOfferCore(config, parameters);

      setStatus("success");
      setResult(fulfillOfferResult);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return {
    fulfillOffer,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useFulfillOffer };
