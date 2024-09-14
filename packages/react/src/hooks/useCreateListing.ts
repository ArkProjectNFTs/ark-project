"use client";

import { useMutation } from "@tanstack/react-query";

import { createListing, CreateListingParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

export type CreateListingResult = {
  orderHash: bigint | undefined;
  transactionHash: string;
};

function useCreateListing() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["createListing"],
    mutationFn: async (parameters: CreateListingParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      const result = await createListing(config, parameters);

      return result;
    }
  });

  return {
    ...result,
    createListing: mutate,
    createListingAsync: mutateAsync
  };
}

export { useCreateListing };
