"use client";

import { useMutation } from "@tanstack/react-query";

import { cancelOrder, CancelOrderParameters } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useCancel() {
  const config = useConfig();

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ["cancel"],
    mutationFn: async (parameters: CancelOrderParameters) => {
      if (!config) {
        throw new Error("config not loaded");
      }

      return cancelOrder(config, parameters);
    }
  });

  return {
    ...result,
    cancel: mutate,
    cancelAsync: mutateAsync
  };
}

export { useCancel };
