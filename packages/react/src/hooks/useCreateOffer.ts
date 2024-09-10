"use client";

import { useState } from "react";

import {
  createOffer as createOfferCore,
  CreateOfferParameters,
  CreateOfferResult
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export default function useCreateOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CreateOfferResult>();
  const config = useConfig();

  async function createOffer(parameters: CreateOfferParameters) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const createOfferResult = await createOfferCore(config, parameters);

      setResult(createOfferResult);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return {
    createOffer,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    status,
    result
  };
}
export { useCreateOffer };
