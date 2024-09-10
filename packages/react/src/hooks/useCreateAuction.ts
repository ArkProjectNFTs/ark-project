"use client";

import { useState } from "react";

import {
  Config,
  createAuction,
  CreateAuctionParameters,
  type CreateAuctionResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export default function useCreateAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CreateAuctionResult>();
  const config = useConfig();

  async function create(parameters: CreateAuctionParameters) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const createAuctionResult = await createAuction(
        config as Config,
        parameters
      );

      setResult(createAuctionResult);
      setStatus("success");
    } catch (error) {
      console.error("error: failed to create auction", error);
      setStatus("error");
    }
  }

  return {
    create,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useCreateAuction };
