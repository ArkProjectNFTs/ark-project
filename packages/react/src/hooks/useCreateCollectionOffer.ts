"use client";

import { useMutation } from "@tanstack/react-query";

import {
  createCollectionOffer,
  CreateCollectionOfferParameters
} from "@ark-project/core";

import { useConfig } from "./useConfig";

export default function useCreateCollectionOffer() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["useCreatecollectionOffer"],
    mutationFn: async (parameters: CreateCollectionOfferParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      return createCollectionOffer(config, parameters);
    }
  });

  return {
    ...result,
    createCollectionOffer: mutate,
    createCollectionOfferAsync: mutateAsync
  };
}

export { useCreateCollectionOffer };
