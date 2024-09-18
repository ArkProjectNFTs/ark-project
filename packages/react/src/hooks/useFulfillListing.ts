"use client";

import { useMutation } from "@tanstack/react-query";

import {
  fulfillListing,
  type FulfillListingParameters
} from "@ark-project/core";

import { useConfig } from "./useConfig";

function useFulfillListing() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["fulfillListing"],
    mutationFn: async (parameters: FulfillListingParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      return fulfillListing(config, parameters);
    }
  });

  return {
    ...result,
    fulfillListing: mutate,
    fulfillListingAsync: mutateAsync
  };
}

export { useFulfillListing };
