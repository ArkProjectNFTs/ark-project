"use client";

import { useMutation } from "@tanstack/react-query";

import { fulfillOffer, type FulfillOfferParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useFulfillOffer() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["fulfillOffer"],
    mutationFn: async (parameters: FulfillOfferParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      return fulfillOffer(config, parameters);
    }
  });

  return {
    ...result,
    fulfillOffer: mutate,
    fulfillOfferAsync: mutateAsync
  };
}

export { useFulfillOffer };
