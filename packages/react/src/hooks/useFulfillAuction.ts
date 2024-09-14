"use client";

import { useMutation } from "@tanstack/react-query";

import { fulfillAuction, FulfillAuctionParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useFulfillAuction() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["fulfillAuction"],
    mutationFn: async (parameters: FulfillAuctionParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      return fulfillAuction(config, parameters);
    }
  });

  return {
    ...result,
    fulfillAuction: mutate,
    fulfillAuctionAsync: mutateAsync
  };
}

export { useFulfillAuction };
