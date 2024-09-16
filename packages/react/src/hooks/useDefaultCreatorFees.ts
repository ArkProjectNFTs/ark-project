"use client";

import { useQuery } from "@tanstack/react-query";

import { getDefaultCreatorFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useDefaultCreatorFees() {
  const config = useConfig();

  return useQuery({
    queryKey: ["getDefaultCreatorFees"],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      return getDefaultCreatorFees(config);
    }
  });
}

export { useDefaultCreatorFees };
