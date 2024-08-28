"use client";

import { useState } from "react";

import {
  createListing as createListingCore,
  CreateListingParameters
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type CreateListingResult = {
  orderHash: bigint | undefined;
  transactionHash: string;
};

function useCreateListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CreateListingResult>();
  const config = useConfig();

  async function createListing(parameters: CreateListingParameters) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const createListingResult = await createListingCore(config, parameters);

      setResult(createListingResult);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return {
    createListing,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useCreateListing };
