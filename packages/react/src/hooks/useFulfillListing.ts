"use client";

import { useState } from "react";

import {
  fulfillListing as fulfillListingCore,
  FulfillListingParameters,
  FulfillListingResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FulfillListingResult>();
  const config = useConfig();

  async function fulfillListing(parameters: FulfillListingParameters) {
    if (!config) {
      throw new Error("Invalid config.");
    }

    setStatus("loading");

    try {
      const fulfillListingResult = await fulfillListingCore(config, parameters);

      setStatus("success");
      setResult(fulfillListingResult);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return {
    fulfillListing,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useFulfillListing };
