"use client";

import { useMutation } from "@tanstack/react-query";

import { createAuction, CreateAuctionParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

export default function useCreateAuction() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["createAuction"],
    mutationFn: async (parameters: CreateAuctionParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      const result = await createAuction(config, parameters);

      return result;
    }
  });

  return {
    ...result,
    createAuction: mutate,
    createAuctionAsync: mutateAsync
  };
}

export { useCreateAuction };
