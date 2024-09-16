"use client";

import { useState } from "react";

import {
  createCollectionOffer as createCollectionOfferCore,
  CreateCollectionOfferParameters,
  type CreateCollectionOfferResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export default function useCreateCollectionOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CreateCollectionOfferResult>();
  const config = useConfig();

  async function createCollectionOffer(
    parameters: CreateCollectionOfferParameters
  ) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const createCollectionOfferResult = await createCollectionOfferCore(
        config,
        parameters
      );

      setResult(createCollectionOfferResult);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return {
    createCollectionOffer,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}

export { useCreateCollectionOffer };
