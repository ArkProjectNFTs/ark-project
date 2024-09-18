"use client";

import { useMutation } from "@tanstack/react-query";

import { createOffer, type CreateOfferParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

export default function useCreateOffer() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["createOffer"],
    mutationFn: async (parameters: CreateOfferParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      const result = await createOffer(config, parameters);

      return result;
    }
  });

  return {
    ...result,
    createOffer: mutate,
    createOfferAsync: mutateAsync
  };
}
export { useCreateOffer };
